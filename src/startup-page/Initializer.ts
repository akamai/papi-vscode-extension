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
import { getEdgercFromSettings, EdgercSection, } from "./InputHelper";
import { saveSettings, SettingsType, getLogger } from "../FileHelper";
import * as _ from "underscore";

const INDEX = __dirname + "/../../resources/index.html";

export interface FileInformation {
  groupId: string;
  contractId: string;
  propertyId: string;
  propertyVersion: number;
  productId?: string;
  ruleFormat?: string;
  propertyName?: string;
  filePath: string;
}

export interface EdgercInformation {
  edgercSection: EdgercSection;
  accountSwitchKey?: string;
}

export function getOpenFilesDetails(extensionUri: vscode.Uri): Promise<FileInformation> {
  const document = vscode.window.activeTextEditor?.document;
  if (document) {
    const filePath = document.uri.fsPath;
    if (filePath.substring(filePath.length-5, filePath.length) === '.json') {
      try {
        const rules = JSON.parse(document.getText());
        if (rules.contractId && rules.groupId && rules.propertyId && rules.rules) {
          let fileInformation: FileInformation = {
            groupId: rules.groupId,
            contractId: rules.contractId,
            productId: rules.productId,
            ruleFormat: rules.ruleFormat,
            propertyName: rules.propertyName,
            propertyId: rules.propertyId,
            propertyVersion: rules.propertyVersion,
            filePath: filePath,
          };
          saveSettings(fileInformation, SettingsType.local);
          return Promise.resolve(fileInformation);
        }
      } catch(error) {
        getLogger().appendLine("Not a valid rules file. Resolve syntax errors")
        return Promise.reject();
      }
      
    }
  }
  return Promise.reject();
}

export function getEdgercState(): Promise<EdgercInformation> {
  let edgercSection: EdgercSection | undefined;
  let accountSwitchKey: string | undefined;
  try {
    let userSettings = getEdgercFromSettings();
    edgercSection = userSettings.edgercSection;
    accountSwitchKey = userSettings.accountSwitchKey;
    if (
      _.isString(edgercSection.host) &&
      _.isString(edgercSection.accessToken) &&
      _.isString(edgercSection.accessToken) &&
      _.isString(edgercSection.clientSecret)
    ) {
      return Promise.resolve({
        edgercSection,
        accountSwitchKey
      })
    } else {
      edgercSection = undefined;
      throw new Error("Edgerc not configured");
    }
  } catch (error) {
    return Promise.reject(error);
  }
}

export function getWebviewContent(extensionUri: vscode.Uri): vscode.WebviewPanel {
  // Create and display input form
  const panel = vscode.window.createWebviewPanel(
    "Input Form", // Identifies the type of the webview. Used internally
    "Akamai Property Manager", // Title of the panel displayed to the user
    vscode.ViewColumn.One, // Editor column to show the new webview panel in.
    {
      // localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))],
      enableScripts: true,
    } // Webview options. true - for running javascript on the input page.
  );
  return panel;
}

export function displayPage(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
  const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'StyleSheet', '/../resources/styles.css'));
  const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'JavaScript', '/../resources/script.js'));
  const searchUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'Image', '/../resources/searchButton.png'));
  const tickUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'Image', '/../resources/tickButton.png'));
  const crossUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'Image', '/../resources/crossButton.png'));
  panel.webview.html = `<!DOCTYPE html>
  <html lang='en'>
  
  <head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Akamai Property Manager</title>
    <link rel='stylesheet' type='text/css' href='${styleUri}' media='screen' />
    <script src='https://code.jquery.com/jquery-1.9.1.min.js'></script>
    <script src='${scriptUri}'></script>
  </head>
  
  <body>
    <h1>Property Manager</h1>
  
    <div class='container' id='allFormsDiv'>
      <div id='links'>
        </br><a class='link' id='configureEdgerc'>Back to authentication</a></br>
        <div id='externalLinksDiv'>
          <a class='link' id='downloadLink'>Download a rules file</a></br>
          <a class='link' id='useLocalink'>Use a local rules file</a>
        </div>
      </div>
      <div id='edgercDiv'>
        <h2 id='edgercHeading'>Authenticate to Akamai platform</h2>
        <form id='edgercForm' class='form' enctype='text/plain'>
          <label for='edgercFile'>Edgerc file</label>
          <input type='file' id='edgercFile' name='edgercFile' required>
          <label for='section'>EdgeGrid credentials</label>
          <select id='section' name='section' required>
          </select>
          <label for='accountSwitchKey'>Optional: Account Switch Key</label>
          <input type='text' id='accountSwitchKey' name='accountSwitchKey' placeholder='Enter the key'>
          <button id='button0'>Authenticate</button>
        </form>
      </div>
  
      <div id='externalFormsDiv'>
        <div id='downloadDiv'>
          <h2 id='downloadHeading'>Download a rules file</h2>
          <form id='downloadForm' class='form' enctype='text/plain'>
            <label for='propertyName'>Property name</label>
            <input type='text' id='propertyName' name='propertyName' placeholder='example.com' required>
            <div id='search'>
              <div id='search-item'>
              <img src="${searchUri}" alt="search"></div>
            </div>
            <label for='propertyVersion'>Property version</label>
            <select id='propertyVersion' name='propertyVersion' required>
              <option value = ''>-- select a version --</option>
            </select>
            <button id='button1'>Download</button>
          </form>
        </div>
  
        <div id='useLocalDiv'>
          <h2 id=useLocalHeading>Use a local rules file</h2>
          <form id='useLocalForm' class='form' enctype='text/plain'>
            <label for='filePath'>File selected</label>
            <input type='text' id='filePath' name='filePath' required>
            <label for='propertyName1'>Property name</label>
            <input type='text' id='propertyName1' name='propertyName1' required readonly>
            <button id='button2'>Edit</button>
            <button id='button3'>Validate</button>
          </form>
        </div>
      </div>
    </div>
    <div class='loader' id='loader'></div>
    <article id='searchUri' data-uri='${searchUri}'></article>
    <article id='tickUri' data-uri='${tickUri}'></article>
    <article id='crossUri' data-uri='${crossUri}'></article>
  </body>
  
  </html>`
}
