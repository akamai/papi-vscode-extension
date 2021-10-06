//  Copyright 2021. Akamai Technologies, Inc
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

/**
 * @author Sid Heggadahalli <sheggada>
 */

import * as vscode from 'vscode';
import { readJsonFile, getLogger } from '../FileHelper';
import * as _ from 'underscore';

enum LIST_OF {
  BEHAVIOR = "behavior",
  CRITERIA = "criteria",
}

export enum DEFINITION_OF {
  BEHAVIORS = "behaviors",
  CRITERIA = "criteria",
  CHILDREN = "children",
  VARIABLES = "variables",
  OPTIONS = "options",
}

export enum EXTERNAL_RESOURCE_NAMES {
  cpcode = 'cpcode',
  netStorage = 'netStorage',
  awsAccessKey = 'awsAccessKey',
  gcsAccessKey = 'gcsAccessKey',
  adaptiveAcceleration = 'adaptiveAcceleration',
  tokenRevocationBlacklist = 'tokenRevocationBlacklist',
  edgeWorker = 'edgeWorker',
  logStream = 'logStream',
  jwtKey = 'jwtKey',
  cloudWrapperLocation = 'cloudWrapperLocation',
  customBehavior = 'customBehavior'
}

const GHOST_VARIABLES = [
  "AKA_PM_CACHEABLE_OBJECT",
"AK_BASE_URL",
"AK_CLIENT_IP",
"AK_CLIENT_REAL_IP",
"AK_CLIENT_RTT",
"AK_CLIENT_TRANSFER_TIME",
"AK_CLIENT_TURNAROUND_TIME",
"AK_CONNECTED_CLIENT_IP",
"AK_CPCODE",
"AK_CURRENT_TIME",
"AK_DOMAIN",
"AK_EDGEWORKERS_FAILURE",
"AK_EDGEWORKERS_STATUS",
"AK_EXTENSION",
"AK_FILENAME",
"AK_FIREWALL_ALERTED_RULES",
"AK_FIREWALL_DENY_RULEID",
"AK_FIREWALL_DETECTED_RULES",
"AK_FIREWALL_MITIGATED_RULES",
"AK_FIREWALL_TRIGGERED_RULES",
"AK_GHOST_IP",
"AK_GHOST_SERVICE_IP",
"AK_HOST",
"AK_HOST_CNAME_CHAIN",
"AK_MAPRULE",
"AK_METHOD",
"AK_ORIGINAL_URL",
"AK_ORIGIN_DNS_NAME",
"AK_PATH",
"AK_PROTOCOL_NEGOTIATION",
"AK_QUERY",
"AK_REFERENCE_ID",
"AK_REQUEST_ID",
"AK_SCHEME",
"AK_SLOT",
"AK_TLS_CIPHER_NAME",
"AK_TLS_ENCRYPTION_BITS",
"AK_TLS_PREFERRED_CIPHERS",
"AK_TLS_SNI_NAME",
"AK_TLS_VERSION",
"AK_URL"
];

const DEFINITIONS = "definitions";
const ALL_OF = "allOf";
const PROPERTIES = "properties";
const CATALOG = "catalog";
const NAME = "name";
const ENUM = "enum";
const OPTIONS = "options";
const DEFAULT = "default";

export class SnippetGenerator {
  private extensionPath: string;
  private schema: any;
  private behaviors: string[];
  private criterias: string[];
  private behaviorCompletionItems: vscode.CompletionItem[];
  private criteriaCompletionItems: vscode.CompletionItem[];
  private ruleTemplateCompletionItems: vscode.CompletionItem[];
  private variableCompletionItems: vscode.CompletionItem[];
  private variableValueCompletionItems: vscode.CompletionItem[] | undefined;
  private behaviorDescriptions: any;
  private criteriaDescriptions: any;

  private externalResourceCpcode: vscode.CompletionItem[];
  private externalResourceNetStorage: vscode.CompletionItem[];
  private externalResourceAwsAccessKey: vscode.CompletionItem[];
  private externalResourceGcsAccessKey: vscode.CompletionItem[];
  private externalResourceAdaptiveAcceleration: vscode.CompletionItem[];
  private externalResourceTokenRevocationBlacklist: vscode.CompletionItem[];
  private externalResourceEdgeWorker: vscode.CompletionItem[];
  private externalResourceLogStream: vscode.CompletionItem[];
  private externalResourceJwtKey: vscode.CompletionItem[];
  private externalResourceCloudWrapperLocation: vscode.CompletionItem[];
  private externalResourceCustomBehavior: vscode.CompletionItem[];
    
  constructor(extensionPath: string, propertyId: string) {
    this.extensionPath = extensionPath;
    let schemaPath = extensionPath + `/resources/${propertyId}_papi_schema.json`;
    this.schema = readJsonFile(schemaPath);

    this.behaviors = this.getNames(LIST_OF.BEHAVIOR, DEFINITION_OF.BEHAVIORS);
    console.log(`behavior names length ${this.behaviors.length}`);

    this.criterias = this.getNames(LIST_OF.CRITERIA, DEFINITION_OF.CRITERIA);
    console.log(`criteria names length ${this.criterias.length}`);

    this.behaviorCompletionItems = this.createTextCompletionList(
      DEFINITION_OF.BEHAVIORS
    );
    this.criteriaCompletionItems = this.createTextCompletionList(
      DEFINITION_OF.CRITERIA
    );

    this.behaviorDescriptions = this.createDescriptions(
      DEFINITION_OF.BEHAVIORS
    );
    this.criteriaDescriptions = this.createDescriptions(
      DEFINITION_OF.CRITERIA
    );

    const ruleTemplate = JSON.stringify(
      {
        name: "",
        children: [],
        behaviors: [],
        criteria: [],
        criteriaMustSatisfy: "all",
      },
      null,
      4
    );

    const variableDefinition = JSON.stringify(
      {
        name: "PMUSER_",
        value: "",
        description: "",
        hidden: false,
        sensitive: false,
      },
      null,
      4
    )
    
    const ruleTemplateCompletionItem = new vscode.CompletionItem(
      "ruleTemplate", vscode.CompletionItemKind.Snippet
    );
    ruleTemplateCompletionItem.insertText = new vscode.SnippetString(
      ruleTemplate
    );
    ruleTemplateCompletionItem.documentation = new vscode.MarkdownString(
      "Insert rule template"
    );
    this.ruleTemplateCompletionItems = [ruleTemplateCompletionItem];

    const variableCompletionItem = new vscode.CompletionItem(
      "variable", vscode.CompletionItemKind.Snippet
    );
    variableCompletionItem.insertText = new vscode.SnippetString(
      variableDefinition
    );
    variableCompletionItem.documentation = new vscode.MarkdownString(
      "Insert variable definition"
    );
    this.variableCompletionItems = [variableCompletionItem];

    //External resources
    const cpCodePath = extensionPath + `/resources/${propertyId}_cpcodes.json`;
    this.externalResourceCpcode = this.getExternalResourceCompletionItem(cpCodePath, EXTERNAL_RESOURCE_NAMES.cpcode);
    const erPath = extensionPath + `/resources/${propertyId}_er.json`;
    this.externalResourceNetStorage = this.getExternalResourceCompletionItem(erPath, EXTERNAL_RESOURCE_NAMES.netStorage);
    this.externalResourceAwsAccessKey = this.getExternalResourceCompletionItem(erPath, EXTERNAL_RESOURCE_NAMES.awsAccessKey);
    this.externalResourceGcsAccessKey = this.getExternalResourceCompletionItem(erPath, EXTERNAL_RESOURCE_NAMES.gcsAccessKey);
    this.externalResourceAdaptiveAcceleration = this.getExternalResourceCompletionItem(erPath, EXTERNAL_RESOURCE_NAMES.adaptiveAcceleration);
    this.externalResourceTokenRevocationBlacklist = this.getExternalResourceCompletionItem(erPath, EXTERNAL_RESOURCE_NAMES.tokenRevocationBlacklist);
    this.externalResourceEdgeWorker = this.getExternalResourceCompletionItem(erPath, EXTERNAL_RESOURCE_NAMES.edgeWorker);
    this.externalResourceLogStream = this.getExternalResourceCompletionItem(erPath, EXTERNAL_RESOURCE_NAMES.logStream);
    this.externalResourceJwtKey = this.getExternalResourceCompletionItem(erPath, EXTERNAL_RESOURCE_NAMES.jwtKey);
    this.externalResourceCloudWrapperLocation = this.getExternalResourceCompletionItem(erPath, EXTERNAL_RESOURCE_NAMES.cloudWrapperLocation);
    this.externalResourceCustomBehavior = this.getExternalResourceCompletionItem(erPath, EXTERNAL_RESOURCE_NAMES.customBehavior);

    getLogger().appendLine("Autocomplete setup complete");
  }

  public getBehaviorCompletionItems(): vscode.CompletionItem[] {
    return this.behaviorCompletionItems;
  }

  public getCriteriaCompletionItems(): vscode.CompletionItem[] {
    return this.criteriaCompletionItems;
  }

  public getRuleTemplateCompletionItems(): vscode.CompletionItem[] {
    return this.ruleTemplateCompletionItems;
  }

  public getVariablesCompletionItems(): vscode.CompletionItem[] {
    return this.variableCompletionItems;
  }

  public getBehaviorDescriptions(): any {
    return this.behaviorDescriptions;
  }

  public getCriteriaDescriptions(): any {
    return this.criteriaDescriptions;
  }

  // update the list everytime it's saved.
  public createVariableValueCompletionItems(ruleTreeString: string) {
    let variableValueCompletionItems: vscode.CompletionItem[] = [];
    if(_.isString(ruleTreeString)) {
      const ruleTree = JSON.parse(ruleTreeString);
      const variables = ruleTree.rules.variables;
      // console.debug(variables);
      variables.forEach((variable: any) => {
        const variableValueCompletionItem = new vscode.CompletionItem(
          variable.name, vscode.CompletionItemKind.Text
        );
        variableValueCompletionItem.insertText = new vscode.SnippetString(
          `"{{user.${variable.name}}}"`
        );
        variableValueCompletionItem.documentation = new vscode.MarkdownString(
          "Insert user variable"
        );
        variableValueCompletionItems.push(variableValueCompletionItem);
      });
      GHOST_VARIABLES.forEach((variable) => {
        const variableValueCompletionItem = new vscode.CompletionItem(
          variable, vscode.CompletionItemKind.Text
        );
        variableValueCompletionItem.insertText = new vscode.SnippetString(
          `"{{builtin.${variable}}}"`
        );
        variableValueCompletionItem.documentation = new vscode.MarkdownString(
          "Insert BuiltIn variable"
        );
        variableValueCompletionItems.push(variableValueCompletionItem);
      });
      this.variableValueCompletionItems = variableValueCompletionItems;
    }
  }

  public getVariableValueCompletionItems(): vscode.CompletionItem[] | undefined{
    return this.variableValueCompletionItems;
  }

  public getExternalResource(name: EXTERNAL_RESOURCE_NAMES): vscode.CompletionItem[] {
    switch (name) {
      case EXTERNAL_RESOURCE_NAMES.cpcode:
        return this.externalResourceCpcode;
      case EXTERNAL_RESOURCE_NAMES.netStorage:
        return this.externalResourceNetStorage;
      case EXTERNAL_RESOURCE_NAMES.awsAccessKey:
        return this.externalResourceAwsAccessKey;
      case EXTERNAL_RESOURCE_NAMES.gcsAccessKey:
        return this.externalResourceGcsAccessKey;
      case EXTERNAL_RESOURCE_NAMES.adaptiveAcceleration:
        return this.externalResourceAdaptiveAcceleration;
      case EXTERNAL_RESOURCE_NAMES.tokenRevocationBlacklist:
        return this.externalResourceTokenRevocationBlacklist;
      case EXTERNAL_RESOURCE_NAMES.edgeWorker:
        return this.externalResourceEdgeWorker;
      case EXTERNAL_RESOURCE_NAMES.logStream:
        return this.externalResourceLogStream;
      case EXTERNAL_RESOURCE_NAMES.jwtKey:
        return this.externalResourceJwtKey;
      case EXTERNAL_RESOURCE_NAMES.cloudWrapperLocation:
        return this.externalResourceCloudWrapperLocation;
      case EXTERNAL_RESOURCE_NAMES.customBehavior:
        return this.externalResourceCustomBehavior;
    }
  }

  public verifyStringOption(jsonPath: any) {
    try {
      let definitionOf = jsonPath[0];
      let name = jsonPath[1];
      let optionName = jsonPath[2];
      // getLogger().appendLine(`${definitionOf}, ${name}, ${optionName}`);
      let optionsDefinition = this.schema[DEFINITIONS][CATALOG][definitionOf][name][PROPERTIES][OPTIONS][PROPERTIES][optionName];
      if(optionsDefinition) {
        if(optionsDefinition.type) {
          if (optionsDefinition.type === "string") {
            return true;
          }
        }
      }
      return false;
    } catch (err) {
      // allow the insertion of the option if the check fails
      return false;
    }
  }

  private getExternalResourceCompletionItem(path: string, name: EXTERNAL_RESOURCE_NAMES): vscode.CompletionItem[] {
    const externalResources = readJsonFile(path)["externalResources"];
    let completionItems: vscode.CompletionItem[] = [];
    switch (name) {
      case EXTERNAL_RESOURCE_NAMES.cpcode:
        getLogger().appendLine(`Generating external completion item: cpcode`);
        // availableCpCodes
        return this.getCpcodeCompletionItem(path, name);  
      case EXTERNAL_RESOURCE_NAMES.netStorage:
        getLogger().appendLine(`Generating external completion item: netStorage`);
        try {
          const availableNetStorageGroups = externalResources["availableNetStorageGroups"];
          if(availableNetStorageGroups != null) {
            getLogger().appendLine(`external resources contain netStorage`);
            availableNetStorageGroups.forEach((netStorage: any) => {
              const completionItem = new vscode.CompletionItem(`${netStorage.name} - (${netStorage.downloadDomainName})`, vscode.CompletionItemKind.Value);
              let snippet: any = {downloadDomainName: netStorage.downloadDomainName, cpCode: netStorage.cpCodeList[0].cpCode, g2oToken: netStorage.cpCodeList[0].g2oToken};
              let snippetString: string = JSON.stringify(snippet, null, 4);
              completionItem.insertText = new vscode.SnippetString(snippetString);
              completionItems.push(completionItem);
            });
            return completionItems;
          }
        } catch(error) {
          getLogger().appendLine(`Error message ${(error as Error).message}`);
        }
        break;
      case EXTERNAL_RESOURCE_NAMES.awsAccessKey:
        getLogger().appendLine(`Generating external completion item: awsAccessKey`);
        const awsAccessKeys = externalResources["awsAccessKeys"];
        if(awsAccessKeys != null) {
          getLogger().appendLine(`external resources contain awsAccessKeys`);
          let values = Object.values(awsAccessKeys);
          values.forEach((awsAccessKey: any) => {
            const completionItem = new vscode.CompletionItem(`${awsAccessKey.displayName}`, vscode.CompletionItemKind.Value);
            completionItem.insertText = new vscode.SnippetString(`"${awsAccessKey.guid}"`);
            completionItems.push(completionItem);
          });
          return completionItems;
        }
        break;
      case EXTERNAL_RESOURCE_NAMES.gcsAccessKey:
        getLogger().appendLine(`Generating external completion item: gcsAccessKey`);
        const gcsAccessKeys = externalResources["gcsAccessKeys"];
        if(gcsAccessKeys != null) {
          getLogger().appendLine(`external resources contain gcsAccessKeys`);
          let values = Object.values(gcsAccessKeys);
          values.forEach((gcsAccessKey: any) => {
            const completionItem = new vscode.CompletionItem(`${gcsAccessKey.displayName}`, vscode.CompletionItemKind.Value);
            completionItem.insertText = new vscode.SnippetString(`"${gcsAccessKey.guid}"`);
            completionItems.push(completionItem);
          });
          return completionItems;
        }
        break;
      case EXTERNAL_RESOURCE_NAMES.adaptiveAcceleration:
        getLogger().appendLine(`Generating external completion item: adaptiveAcceleration`);
        const adaptiveAcceleration = externalResources["adaptiveAcceleration"];
        if(adaptiveAcceleration != null) {
          getLogger().appendLine(`external resources contain awsAccessKeys`);
          let values = Object.values(adaptiveAcceleration);
          values.forEach((acc: any) => {
            const completionItem = new vscode.CompletionItem(`${acc.name}`, vscode.CompletionItemKind.Value);
            completionItem.insertText = new vscode.SnippetString(`"${acc.id}"`);
            completionItems.push(completionItem);
          });
          return completionItems;
        }
        break;
      case EXTERNAL_RESOURCE_NAMES.tokenRevocationBlacklist:
        getLogger().appendLine(`Generating external completion item: tokenRevocationBlacklist`);
        const tokenRevocationBlacklist = externalResources["tokenRevocationBlacklist"];
        if(tokenRevocationBlacklist != null) {
          getLogger().appendLine(`external resources contain tokenRevocationBlacklist`);
          let values = Object.values(tokenRevocationBlacklist);
          values.forEach((token: any) => {
            const completionItem = new vscode.CompletionItem(`${token.name}`, vscode.CompletionItemKind.Value);
            completionItem.insertText = new vscode.SnippetString(`${token.id}`);
            completionItems.push(completionItem);
          });
          return completionItems;
        }
        break;
      case EXTERNAL_RESOURCE_NAMES.edgeWorker:
        getLogger().appendLine(`Generating external completion item: edgeWorker`);
        const edgeWorkers = externalResources["edgeWorkers"];
        if(edgeWorkers != null) {
          getLogger().appendLine(`external resources contain edgeWorker`);
          let values = Object.values(edgeWorkers);
          values.forEach((worker: any) => {
            const completionItem = new vscode.CompletionItem(`${worker.name}`, vscode.CompletionItemKind.Value);
            completionItem.insertText = new vscode.SnippetString(`"${worker.id}"`);
            completionItems.push(completionItem);
          });
          return completionItems;
        }
        break;
      case EXTERNAL_RESOURCE_NAMES.logStream:
        getLogger().appendLine(`Generating external completion item: logStream`);
        const logStream = externalResources["logStream"];
        if(logStream != null) {
          getLogger().appendLine(`external resources contain logStream`);
          let values = Object.values(logStream);
          values.forEach((stream: any) => {
            const completionItem = new vscode.CompletionItem(`${stream.name}`, vscode.CompletionItemKind.Value);
            completionItem.insertText = new vscode.SnippetString(`${stream.id}`);
            completionItems.push(completionItem);
          });
          return completionItems;
        }
        break;
      case EXTERNAL_RESOURCE_NAMES.jwtKey:
        getLogger().appendLine(`Generating external completion item: jwtKey`);
        const jwtKeyWithAlg = externalResources["jwtKeyWithAlg"];
        if(jwtKeyWithAlg != null) {
          getLogger().appendLine(`external resources contain jwtKey`);
          let values = Object.values(jwtKeyWithAlg);
          values.forEach((jwtKey: any) => {
            const completionItem = new vscode.CompletionItem(`${jwtKey.name}`, vscode.CompletionItemKind.Value);
            completionItem.insertText = new vscode.SnippetString(`"${jwtKey.jwt}"`);
            completionItems.push(completionItem);
          });
          return completionItems;
        }
        break;
      case EXTERNAL_RESOURCE_NAMES.cloudWrapperLocation:
        getLogger().appendLine(`Generating external completion item: cloudWrapperLocation`);
        const cloudWrapperLocation = externalResources["cloudWrapperLocation"];
        if(cloudWrapperLocation != null) {
          getLogger().appendLine(`external resources contain cloudWrapperLocation`);
          let values = Object.values(cloudWrapperLocation);
          values.forEach((wrapper: any) => {
            const completionItem = new vscode.CompletionItem(`${wrapper.location}`, vscode.CompletionItemKind.Value);
            completionItem.insertText = new vscode.SnippetString(`"${wrapper.sroMapName}"`);
            completionItems.push(completionItem);
          });
          return completionItems;
        }
        break;
      case EXTERNAL_RESOURCE_NAMES.customBehavior:
        getLogger().appendLine(`Generating external completion item: customBehavior`);
        const customBehaviors = externalResources["customBehaviors"];
        if(customBehaviors != null) {
          getLogger().appendLine(`external resources contain customBehavior`);
          let values = Object.values(customBehaviors);
          values.forEach((behavior: any) => {
            const completionItem = new vscode.CompletionItem(`${behavior.name}`, vscode.CompletionItemKind.Value);
            completionItem.insertText = new vscode.SnippetString(`"${behavior.behaviorId}"`);
            completionItems.push(completionItem);
          });
          return completionItems;
        }
        break;
    }
    return [];
  }

  private getCpcodeCompletionItem(path: string, name: EXTERNAL_RESOURCE_NAMES): vscode.CompletionItem[] {
    const cpCodes = readJsonFile(path);
    let completionItems: vscode.CompletionItem[] = [];
    cpCodes.forEach((cpCode: any) => {
      const completionItem = new vscode.CompletionItem(`${cpCode.name} - ${cpCode.id}`, vscode.CompletionItemKind.Value);
      completionItem.insertText = new vscode.SnippetString(`${cpCode.id}`);
      completionItems.push(completionItem);
    });
    return completionItems;
  }

  private getBehaviors(): string[] {
    return this.behaviors;
  }

  private getCriterias(): string[] {
    return this.criterias;
  }

  private getSnippet(definitionOf: DEFINITION_OF, name: string): string {
    try {
      let optionsDefinition = this.schema[DEFINITIONS][CATALOG][definitionOf][
        name
      ][PROPERTIES][OPTIONS][PROPERTIES];
      let snippet = this.createSnippetBody(optionsDefinition, name);
      return JSON.stringify(snippet, null, 4);
    } catch (err) {
      throw new Error((err as Error).message);
    }
  }

  private getNames(listOf: LIST_OF, definitionOf: DEFINITION_OF): string[] {
    let list = this.schema[DEFINITIONS][listOf][ALL_OF];
    let names: string[] = new Array();
    try {
      for (let entry of list) {
        if (entry[PROPERTIES]) {
          for (let name of entry[PROPERTIES][NAME][ENUM]) {
            if (this.schema[DEFINITIONS][CATALOG][definitionOf][name]) {
              names.push(name);
            }
          }
          // let names: string[] = entry[PROPERTIES][NAME][ENUM];
          // console.debug(`number of ${listOf}s - ${names.length}`);
          return names;
        }
      }

      throw new Error(`Unable to find the ${listOf} names`);
    } catch (err) {
      console.error(err);
      throw new Error((err as Error).message);
    }
  }

  private createSnippetBody(optionsDefinition: any, name: string): any {
    let snippet: any = { name: name, options: {} };
    let num: number = 1;
    Object.keys(optionsDefinition).forEach(function (key) {
      if (optionsDefinition[key][DEFAULT]) {
        snippet[OPTIONS][key] = optionsDefinition[key][DEFAULT];
      } else {
        snippet[OPTIONS][key] = ``;
        num++;
      }
    });
    return snippet;
  }

  private createTextCompletionList(
    objectType: DEFINITION_OF
  ): vscode.CompletionItem[] {
    let objectNames: string[];
    if (objectType === DEFINITION_OF.BEHAVIORS) {
      objectNames = this.getBehaviors();
    } else {
      objectNames = this.getCriterias();
    }

    let textCompletionList: vscode.CompletionItem[] = new Array(
      objectNames.length
    );
    for (let i = 0; i < objectNames.length; i++) {
      try {
        let snippet: string = this.getSnippet(objectType, objectNames[i]);
        const snippetCompletion = new vscode.CompletionItem(objectNames[i]);
        snippetCompletion.insertText = new vscode.SnippetString(snippet);
        if (objectType === DEFINITION_OF.BEHAVIORS) {
          snippetCompletion.documentation = new vscode.MarkdownString(
            `Insert Behavior`
          );
        } else if (objectType === DEFINITION_OF.CRITERIA) {
          snippetCompletion.documentation = new vscode.MarkdownString(
            `Insert Criterion`
          );
        }
        textCompletionList[i] = snippetCompletion;
      } catch (err) {
        console.log(`error during generating snippet for ${objectNames[i]}`);
        console.error((err as Error).message);
      }
    }
    console.log(`Text completion list created for '${objectType}'`);
    return textCompletionList;
  }

  private createDescriptions(type: DEFINITION_OF) {
    let platformtk = readJsonFile(
      __dirname + "/../../resources/platformtk_message_en_US.json"
    );
    let descriptions: any = {};
    if (type === DEFINITION_OF.BEHAVIORS) {
      this.behaviors.forEach((behavior) => {
        if (platformtk.features[behavior.toLowerCase()]) {
          const featureDetails = platformtk.features[behavior.toLowerCase()];
          let behaviorDetails: any = {};
          behaviorDetails["description"] = featureDetails["description"][
            "html"
          ].replace(/(<([^>]+)>)/gi, "");
          behaviorDetails["options"] = {};
          Object.keys(featureDetails.options).forEach((option) => {
            behaviorDetails["options"][option] = {};
            try {
              behaviorDetails["options"][option][
                "description"
              ] = featureDetails["options"][option]["description"][
                "html"
              ].replace(/(<([^>]+)>)/gi, "");
            } catch (err) {}
          });
          descriptions[behavior] = behaviorDetails;
        }
      });
    } else if (type === DEFINITION_OF.CRITERIA) {
      this.criterias.forEach((criteria) => {
        if (platformtk.matches[criteria.toLowerCase()]) {
          const matchesDetails = platformtk.matches[criteria.toLowerCase()];
          let criteriaDetails: any = {};
          criteriaDetails["description"] = matchesDetails["display_name"];
          criteriaDetails["options"] = {};
          Object.keys(matchesDetails.options).forEach((option) => {
            criteriaDetails["options"][option] = {};
            try {
              criteriaDetails["options"][option][
                "description"
              ] = matchesDetails["options"][option]["description"][
                "html"
              ].replace(/(<([^>]+)>)/gi, "");
            } catch (err) {}
          });
          descriptions[criteria] = criteriaDetails;
        }
      });
    }
    return descriptions;
  }
}
