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
 import * as InputHelper from "../startup-page/InputHelper";
 import { getEdgercState, FileInformation, EdgercInformation } from "../startup-page/Initializer";
 
 // Downloads and updates the schema for a given property id
 // Updates the shcema with all the external resource values
 // Adds autocomplete for all external resources
 // Updates vscode settings to use the schema
export function createSupportingFiles(papi: PapiConnection, propertyId: string, propertyVersion: number, contractId: string,
     groupId: string, productId: string, ruleFormat: string, filePath: string, extensionUri: vscode.Uri): Promise<string> {
    return new Promise((resolve, reject) => {

        papi.getPapiSchema(productId, ruleFormat).then((schema: any) => {
            const schemaPath = `/resources/${propertyId}_papi_schema.json`;
            const schemaUri = vscode.Uri.joinPath(extensionUri, schemaPath);
            papi.listCpcodes(contractId, groupId).then((response: any) => {
                const cpCodesPath = `/resources/${propertyId}_cpcodes.json`;
                const cpCodesUri = vscode.Uri.joinPath(extensionUri, cpCodesPath);
        
                let allCpcodes: {id: number, name: string}[] = [];
                let productCpcodeIds: number[] = [];
                let items: any[] = response['cpcodes']['items'];
                items.forEach(item => {
                    let id: number = parseInt(item.cpcodeId.substr(4), 10);
                    let name: string = item.cpcodeName;
                    allCpcodes.push({id, name});
                    let productIds: string[] = item.productIds;
                    if(productIds.includes(productId)) {
                        productCpcodeIds.push(id);
                    }
                });
                schema.definitions.catalog.option_types.cpcode.properties.id = {enum: productCpcodeIds};
                writeJsonFile(cpCodesUri.path, allCpcodes);
                writeJsonFile(schemaUri.path, schema);
                configJsonSchema(filePath, schemaUri.path);
                // resolve(filePath);
            });

            papi.getExternalResources(propertyId, propertyVersion).then((response: any) => {
                const erPath = `/resources/${propertyId}_er.json`;
                const erUri = vscode.Uri.joinPath(extensionUri, erPath);
                writeJsonFile(erUri.path, response);
            
                // let netStorage: {downloadDomainName: string, cpCode: number, g2oToken: string}[] = [];
                // let items: any[] = response['availableNetStorageGroups'];
                // items.forEach(item => {
                //     let row = {downloadDomainName : item.downloadDomainName, cpCode: item.cpCodeList[0].cpCode, g2oToken: item.cpCodeList[0].g2oToken}
                //     netStorage.push(row);
                //     schema.definitions.catalog.option_types.availableNetStorageGroups = {enum: netStorage};
                // });
                // netStorage = []; // garbage collection
        
                // let allCustomBehaviors: {id: string, name: string}[] = [];
                // items = response['customBehaviors'];
                // items.forEach(item => {
                //     let id = Object.keys(item)[0];
                //     let row = {id: id, name : item[id]}
                //     allCustomBehaviors.push(row);
                // });
                // schema.definitions.catalog.option_types.customBehaviors = {enum: allCustomBehaviors};
                // allCustomBehaviors = []; // garbage collection
        
                // let allLogStreams: {id: string, name: string}[] = [];
                // items = response['logStream'];
                // items.forEach(item => {
                //     let row = {id: item.id, name : item.name}
                //     allLogStreams.push(row);
                // });
                // schema.definitions.catalog.option_types.logStreams = {enum: allLogStreams};
                // allLogStreams = []; // garbage collection
            
                // let allEdgeWorkers: {id: string, name: string}[] = [];
                // items = response['logStream'];
                // items.forEach(item => {
                //     let row = {id: item.id, name : item.name}
                //     allEdgeWorkers.push(row);
                // });
                // schema.definitions.catalog.option_types.edgeWorkers = {enum: allEdgeWorkers};
                // allEdgeWorkers = [];// garbage collection
                // writeJsonFile(schemaUri.path, schema);
                // configJsonSchema(filePath, schemaUri.path);
                resolve(filePath);
            });
        });
    });
}

function configJsonSchema(filePath: string, schemaPath: string) {
    if(schemaPath.charAt(0) === '/') {
      schemaPath = schemaPath.substr(1, schemaPath.length);
    }
    const schemaConfig = {
      "fileMatch": [
        filePath
      ],
      "url": schemaPath
    };
    const vscodeConfiguration = vscode.workspace.getConfiguration();
    const schemas = vscodeConfiguration.get("json.schemas");
    if(_.isObject(schemas) && _.isArray(schemas)) {
      saveSettings(schemas, SettingsType.user);
      let replacementIndices: number[] = [];
      for(let i = 0; i < schemas.length; i++) {
        if(_.isObject(schemas[i].fileMatch) && _.isArray(schemas[i].fileMatch)){
          schemas[i].fileMatch.forEach((element: string) => {
            if(element === filePath) {
              replacementIndices.push(i);
            }
          });
        }
      }
      replacementIndices.forEach(index => {
        schemas.splice(index, 1);
      });
      schemas.push(schemaConfig);
      vscodeConfiguration.update("json.schemas", schemas, vscode.ConfigurationTarget.Global);
    } else {
        vscodeConfiguration.update("json.schemas", [schemaConfig], vscode.ConfigurationTarget.Global);
    }
}