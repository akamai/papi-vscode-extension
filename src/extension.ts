//  Copyright 2020. Akamai Technologies, Inc
//  
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//  
//      http://www.apache.org/licenses/LICENSE-2.0
//  
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.

import * as vscode from "vscode";
import {Validator} from "jsonschema";
import { DEFINITION_OF, SnippetGenerator, } from "./auto-complete/SnippetGenerator";
import { PapiConnection, } from "./external-api/PapiConnection";
import * as _ from "underscore";
import { getSettings, getLogger, readJsonFile, SettingsType, writeJsonFile, clearSettings, doesFileExists} from "./FileHelper";
import { PapiDefinitionProvider, } from "./auto-complete/PapiDefinitionProvider";
import { getOpenFilesDetails, getWebviewContent, displayPage} from "./startup-page/Initializer";
import { MessageHandler, } from "./startup-page/MessageHandler";
import * as InputHelper from "./startup-page/InputHelper";
import { Authentication, } from "./external-api/Authentication";
import { verifyNodeName, getJsonValue, } from "./auto-complete/JsonNodeProvider";

// this method is called when the extension is activated
// the extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let generatorMap = new Map<string, SnippetGenerator>();
  let papiDefinitionProvider: PapiDefinitionProvider;

  const vscodeConfiguration = vscode.workspace.getConfiguration();
  vscodeConfiguration.update("workbench.editor.enablePreview", false, vscode.ConfigurationTarget.Global);
  vscodeConfiguration.update("editor.minimap.enabled", true, vscode.ConfigurationTarget.Global);
  vscodeConfiguration.update("breadcrumbs.enabled", true, vscode.ConfigurationTarget.Global);

  const websiteCommand = vscode.commands.registerCommand("papi.edit", () => {
    const document = vscode.window.activeTextEditor?.document;
    const panel = getWebviewContent(context.extensionUri);
    
    getOpenFilesDetails(context.extensionUri).then(() => {
      displayPage(panel, context.extensionUri);
    }).catch(() => {
      displayPage(panel, context.extensionUri);
    });
    
    let messageHandler: MessageHandler = new MessageHandler(panel, context.extensionUri);

    panel.webview.onDidReceiveMessage(
      (message) => {
        console.debug(message);
        switch (message.command) {
          case InputHelper.MessageFromWeb.documentReady:
            messageHandler.sendInitialState();
            break;
          case InputHelper.MessageFromWeb.postEdgerc:
            messageHandler.setEdgerc(message.edgerc);
            break;
          case InputHelper.MessageFromWeb.postEdgercSection:
            messageHandler.setEdgercSection(message.edgercSection,message.accountSwitchKey);
            break;
          case InputHelper.MessageFromWeb.searchProperty:
            messageHandler.searchProperty(message.propertyName);
            break;
          case InputHelper.MessageFromWeb.downloadRules:
            messageHandler.downloadRules(message.propertyId, message.propertyVersion).then((filePath) => {
              setupProviders(message.propertyId, filePath);
            }, 
            () => {
              vscode.window.showErrorMessage("Something went wrong!");
              panel.dispose();
            });
            break;
          case InputHelper.MessageFromWeb.userLocalRules:
            messageHandler.useLocalRules(message.fileInfo).then((filePath) => {
              setupProviders(message.fileInfo.propertyId, filePath);
              panel.dispose();
            }, 
            () => {
              vscode.window.showErrorMessage("Something went wrong!");
              panel.dispose();
            });
            break;
          case InputHelper.MessageFromWeb.validateWithServer:
            if(document) {
              validateWithServer(document, panel);
            };
            break;
        }
      }
    );
    panel.onDidDispose(() => {
      panel.dispose();
    });
  });

  function setupProviders(propertyId: string, filePath: string) {
    const schemaPath = `/resources/${propertyId}_papi_schema.json`;
    const schemaUri = vscode.Uri.joinPath(context.extensionUri, schemaPath);
    const snippetGenerator = new SnippetGenerator(schemaUri.path);
    generatorMap.set(filePath, snippetGenerator);
    let completionItemProvider = getCompletionItemProvider(filePath, snippetGenerator);
    context.subscriptions.push(completionItemProvider);
    let names = filePath.split("/");
    const fileName = names[names.length-1];
    vscode.window.showInformationMessage(`Akamai plugin enabled for ${fileName}.`);
  }

  function validateWithServer(document: vscode.TextDocument, panel: vscode.WebviewPanel | undefined = undefined)  {
    let edgercSection: InputHelper.EdgercSection;
    let accountSwitchKey: string | undefined;
    try {
      const userSettings = getSettings(SettingsType.user);
      if(userSettings && userSettings.edgercSection) {
        edgercSection = userSettings.edgercSection;
        accountSwitchKey = userSettings.accountSwitchKey;
      } else {
        throw new Error(`Edgerc credentials not setup`);
      }
    } catch (error) {
      vscode.window.showInformationMessage(`Set up the edgerc credentials before you validate.`);
      return;
    }

    if (document) {
      // Ask user to save untitled file
      document.save().then(() => {
        const filePath = document.uri.path;
        let names = filePath.split("/");
        const fileName = names[names.length-1];
        if (filePath.substring(filePath.length-5, filePath.length) != '.json') {
          vscode.window.showInformationMessage("You can only validate rules JSON files.");
          panel?.dispose();
        } else {
          let rules: any;
          try {
            rules = JSON.parse(document.getText());
          } catch (error) {
            vscode.window.showInformationMessage("Resolve syntax errors in the JSON file.");
            return;
          }
          try {
            const validator = new Validator();
            const schemaPath = vscode.Uri.joinPath(context.extensionUri, `/resources/${rules.propertyId}_papi_schema.json`).path;
            if(!doesFileExists(schemaPath)) {
              throw new Error("Click Download or Edit before validating this file.");
            }
            const schema = readJsonFile(schemaPath);
              const validation = validator.validate(rules, schema);
              if (validation.errors.length > 0) {
                throw new Error("Syntax validation failed. Resolve errors in the JSON file.");
              }
          } catch (error) {
            vscode.window.showInformationMessage(error.message);
            panel?.dispose();
            return;
          }
          
          let workspaceSettings = getSettings(SettingsType.workspace);
          rules.productId = workspaceSettings[filePath].productId;
          if (
            !_.isString(rules.ruleFormat) &&
            _.isString(workspaceSettings[filePath].ruleFormat)
          ) {
            rules.ruleFormat = workspaceSettings[filePath].ruleFormat;
          }
          const papi = new PapiConnection(new Authentication(edgercSection), accountSwitchKey);
          papi
            .validateRules(
              rules.contractId,
              rules.groupId,
              rules,
              rules.ruleFormat
            )
            .then((response: any) => {
              let output: any = {};
              if (response.errors) {
                output.errors = response.errors;
              } else {
                output.errors = "NO ERRORS";
              }
              if (response.warnings) {
                output.warnings = response.warnings;
              } else {
                output.warnings = "NO WARNINGS";
              }
              const errorFilePath = vscode.Uri.joinPath(context.extensionUri, `/resources/Validated_${fileName}`).path;
              writeJsonFile(errorFilePath, output);
              papiDefinitionProvider = new PapiDefinitionProvider(document);
              let documentFilter : vscode.DocumentFilter = {
                language: "json",
                scheme: "file",
                pattern: errorFilePath
              };
              const locationProvider = vscode.languages.registerDefinitionProvider(
                documentFilter,
                papiDefinitionProvider
              );
              context.subscriptions.push(locationProvider);
              let EWDocument: vscode.Uri = vscode.Uri.parse(errorFilePath);
              if(panel) {
                panel.dispose();
              }
              vscode.window.showTextDocument(document).then(() => {
                vscode.window.showTextDocument(EWDocument);
              })
            })
            .catch((error: any) => console.error(error));
        }
      });
    }
  };

  const validateCommand = vscode.commands.registerCommand("papi.validate", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document) {
        validateWithServer(editor.document);
      } else {
        vscode.window.showErrorMessage("You can only validate a PAPI rules file.")
      }
    }
  );

  // all completionItems except variablevalues are created and stored only once since this method runs everytime something is typed.
  // variablesdefinition can be added/updated dynamically, Hence this completion item is updated everytime a rules doucment is updated
  function getCompletionItemProvider(filePath: string, snippetGenerator: SnippetGenerator): vscode.Disposable {
      const completionItemProvider = vscode.languages.registerCompletionItemProvider(
      {
        language: "json",
        scheme: "file",
        pattern: filePath
      },
      {
        provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position,
          token: vscode.CancellationToken,
          context: vscode.CompletionContext
        ) {
          getLogger().appendLine(filePath);
          let nodeVerification = verifyNodeName(document, position);
          if (
            nodeVerification.isMatch &&
            nodeVerification.matchString === DEFINITION_OF.BEHAVIORS
          ) {
            return snippetGenerator.getBehaviorCompletionItems();
          } else if (
            nodeVerification.isMatch &&
            nodeVerification.matchString === DEFINITION_OF.CRITERIA
          ) {
            return snippetGenerator.getCriteriaCompletionItems();
          } else if (
            nodeVerification.isMatch &&
            nodeVerification.matchString === DEFINITION_OF.CHILDREN
          ) {
            return snippetGenerator.getRuleTemplateCompletionItems();
          } else if (
            nodeVerification.isMatch &&
            nodeVerification.matchString === DEFINITION_OF.VARIABLES
          ) {
            return snippetGenerator.getVariablesCompletionItems();
          } else if (
            nodeVerification.isMatch &&
            nodeVerification.matchString === DEFINITION_OF.OPTIONS &&
            nodeVerification.pathArray && 
            snippetGenerator.verifyStringOption(nodeVerification.pathArray)
          ) {
            return snippetGenerator.getVariableValueCompletionItems();
          }
        },
      }
    );
    return completionItemProvider;
  }

  vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
    if(editor) {
      let ruleTreeString = editor.document.getText();
      let filePath = editor.document.uri.fsPath;
      let snippetGenerator = generatorMap.get(filePath);
      if(snippetGenerator) {
        snippetGenerator.createVariableValueCompletionItems(ruleTreeString);
      }
      getOpenFilesDetails(context.extensionUri);
    }
  });

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    const ruleTreeString = document.getText();
    let filePath = document.uri.fsPath;
    let snippetGenerator = generatorMap.get(filePath);
    if(snippetGenerator) {
      snippetGenerator.createVariableValueCompletionItems(ruleTreeString);
    }
  });

  // todo: optimize this code further (change it to click instead of hover), disable this if the json file is too big
  const hoverProvider = vscode.languages.registerHoverProvider("json", {
    provideHover(document, position, token) {
      let jsonValue = getJsonValue(document, position);
      if (jsonValue === undefined) {
        return;
      }
      let filePath = document.uri.fsPath;
      let snippetGenerator = generatorMap.get(filePath);
      if(snippetGenerator) {
        if (jsonValue.definitionOf === DEFINITION_OF.BEHAVIORS) {
          if (jsonValue.type === "options" && jsonValue.parentValue) {
            let behaviorDetails = snippetGenerator.getBehaviorDescriptions()[
              jsonValue.parentValue
            ];
            return {
              contents: [
                behaviorDetails["options"][jsonValue.value]["description"],
              ],
            };
          } else if (jsonValue.type === "name") {
            let behaviorDetails = snippetGenerator.getBehaviorDescriptions()[
              jsonValue.value
            ];
            return {
              contents: [behaviorDetails["description"]],
            };
          }
        } else if (jsonValue.definitionOf === DEFINITION_OF.CRITERIA) {
          if (jsonValue.type === "options" && jsonValue.parentValue) {
            let criteriaDetails = snippetGenerator.getCriteriaDescriptions()[
              jsonValue.parentValue
            ];
            return {
              contents: [criteriaDetails[jsonValue.value]["description"]],
            };
          } else if (jsonValue.type === "name") {
            let criteriaDetails = snippetGenerator.getCriteriaDescriptions()[
              jsonValue.value
            ];
            return {
              contents: [criteriaDetails["description"]],
            };
          }
        }
      }
    },
  });

  context.subscriptions.push(
    websiteCommand,
    validateCommand,
    hoverProvider
  );
}

// this method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
  clearSettings(SettingsType.workspace);
  clearSettings(SettingsType.local);
}
