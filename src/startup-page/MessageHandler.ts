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

import * as vscode from "vscode";
import * as _ from "underscore";
import { getLogger, getSettings, saveSettings, SettingsType, writeJsonFile } from "../FileHelper";
import { PapiConnection } from "../external-api/PapiConnection";
import { Authentication } from "../external-api/Authentication";
import * as InputHelper from "./InputHelper";
import { getEdgercState, FileInformation, EdgercInformation } from "./Initializer";
import { identity } from "underscore";
import {createSupportingFiles} from "../auto-complete/EnvironmentCreator"

//Contains methods to take actions based on the messages received from the webapp
export class MessageHandler {
  private extensionUri: vscode.Uri;
  private panel: vscode.WebviewPanel;
  private papi?: PapiConnection;

  constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;
  }

  public sendInitialState() {
    getEdgercState().then((edgercInformation: EdgercInformation) => {
      this.papi = new PapiConnection(
        new Authentication(edgercInformation.edgercSection),
        edgercInformation.accountSwitchKey
      );
      this.panel.webview.postMessage({
        command: InputHelper.MessageFromExt.edgercConfigured,
      });
    }).catch(() => {
      this.panel.webview.postMessage({
        command: InputHelper.MessageFromExt.configureEdgerc,
      });
    });

    // setting the fields of the webapp whenever a edgerc section is set or changed is modified.
    let fileDetails = getSettings(SettingsType.local);
    this.panel.webview.postMessage({
      command: InputHelper.MessageFromExt.setRulesFiles,
      fileDetails: fileDetails,
    });
  }

  public setEdgerc(edgerc: string) {
    let edgercList = InputHelper.parseEdgerc(edgerc);
    let sectionNames = _.keys(edgercList);
    this.panel.webview.postMessage({
      command: InputHelper.MessageFromExt.acceptSectionName,
      edgercList: edgercList,
      sectionNames: sectionNames,
    });
  }

  public setEdgercSection(edgercSection: InputHelper.EdgercSection,accountSwitchKey: string | undefined) {
    this.papi = new PapiConnection(
      new Authentication(edgercSection),
      accountSwitchKey
    );

    InputHelper.setEdgercInSettings(edgercSection, accountSwitchKey);
    this.panel.webview.postMessage({
      command: InputHelper.MessageFromExt.edgercConfigured,
    });

    // setting the fields of the webapp whenever a edgerc section is set or changed is modified.
    let fileDetails = getSettings(SettingsType.local);
    this.panel.webview.postMessage({
      command: InputHelper.MessageFromExt.setRulesFiles,
      fileDetails: fileDetails,
    });
  }

  public searchProperty(propertyName: string) {
    propertyName = propertyName.trim();
    this.getPapi().getProperty(propertyName).then((propertyResult: any) => {
      if (propertyResult.versions.items.length === 0) {
        vscode.window.showInformationMessage(`Couldn't find property '${propertyName}.'`);
        this.panel.webview.postMessage({command: "propertyNotFound"});
        return;
      }
      let propertyId = propertyResult.versions.items[0].propertyId;
      let versions = [];
      let latestVersion: number = 0;
      for (let i = 0; i < propertyResult.versions.items.length; i++) {
        let item = propertyResult.versions.items[i];
        if (latestVersion < item.propertyVersion) {
          latestVersion = item.propertyVersion;
        }
        let entry = {
          propertyVersion: item.propertyVersion,
          productionStatus: item.productionStatus,
          stagingStatus: item.stagingStatus,
        };
        versions.push(entry);
      }
      this.panel.webview.postMessage({
        command: "acceptPropertyVersion",
        propertyId: propertyId,
        latestVersion: latestVersion,
        versions: versions,
      });
    })
    .catch((error: any) => {
      getLogger().appendLine(error);
      this.panel.webview.postMessage({command: "searchError"});
      return;
    })
  }

  public downloadRules(propertyId: string, version: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.getPapi().getPropertyVersionRules(propertyId, version).then((response: any) => {
        const saveOptions: vscode.SaveDialogOptions = {
          saveLabel: 'Save papi rules',
          filters: {
            'RulesFile': ['json']
          }
        };
        vscode.window.showSaveDialog(saveOptions).then( (uri: vscode.Uri | undefined) => {
          if(uri) {
            writeJsonFile(uri.path, response);
            this.panel.dispose();
            vscode.window.showTextDocument(uri);
            let fileInfo: FileInformation = {
              groupId: response.groupId,
              contractId: response.contractId,
              productId: response.productId,
              ruleFormat: response.ruleFormat,
              propertyName: response.propertyName,
              propertyId: response.propertyId,
              propertyVersion: response.propertyVersion,
              filePath: uri.path
            };
            saveSettings({[uri.path]: fileInfo}, SettingsType.workspace);
            resolve(this.setUpRulesEditor(propertyId, version, response.contractId, response.groupId, uri.path));
          } else {
            this.panel.dispose();
          }
        });
      }).catch((error: any) => {
        getLogger().appendLine((error as Error).message);
        reject(error);
      })
    });
  }

  public useLocalRules(fileInfo: FileInformation): Promise<string> {
    saveSettings({[fileInfo.filePath]: fileInfo}, SettingsType.workspace);
    return Promise.resolve(this.setUpRulesEditor(fileInfo.propertyId, fileInfo.propertyVersion, fileInfo.contractId, fileInfo.groupId, fileInfo.filePath));
  }

  public setUpRulesEditor(propertyId: string, version: number, contractId: string, groupId: string, filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.getPapi().listAvailableBehaviors(propertyId, version).then((response: any) => {
        let productId: string = response.productId;
        let ruleFormat: string = response.ruleFormat;
        saveSettings(
          {
            [filePath] : {
              productId: response.productId,
              ruleFormat: response.ruleFormat,
            }
          },
          SettingsType.workspace
        );
        // send large data into garbage collection
        response = null;
        resolve(createSupportingFiles(this.getPapi(),propertyId, version, contractId, groupId, productId, ruleFormat, filePath, this.extensionUri));
      })
      .catch((error) => {
        getLogger().appendLine((error as Error).message);
        reject(error);
      });
    });
  }

  private getPapi(): PapiConnection {
    if (this.papi) {
      return this.papi;
    } else {
      this.panel.webview.postMessage({
        command: InputHelper.MessageFromExt.configureEdgerc,
      });
    }
    throw new Error(
      `PAPI connection not configured. Restart the plugin, if this error continues.`
    );
  }
}
