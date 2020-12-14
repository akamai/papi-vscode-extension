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
  private filepath: string;
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

  constructor(filepath: string) {
    this.filepath = filepath;
    this.schema = readJsonFile(filepath);

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

    console.log("Snippet generator initialized");
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

  public verifyStringOption(jsonPath: any) {
    try {
      let definitionOf = jsonPath[0];
      let name = jsonPath[1];
      let optionName = jsonPath[2];
      getLogger().appendLine(`${definitionOf}, ${name}, ${optionName}`);
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
      throw new Error(err);
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
      throw new Error(err.message);
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
        console.error(err.message);
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
