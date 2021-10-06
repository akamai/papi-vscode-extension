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

import * as fs from "fs";
import * as path from "path";
import {window} from "vscode";

const resourcesFolder = __dirname + "/../resources";
const settingsPath = __dirname + "/../resources/settings.json";
const outputLogger = window.createOutputChannel("Akamai Property Manager");

export function writeJsonFile(fullpath: string, data: any) {
  fullpath = path.normalize(fullpath);
  writeFile(fullpath, JSON.stringify(data, null, 4));
}

export function readJsonFile(fullpath: string) {
  fullpath = path.normalize(fullpath);
  try {
    let jsonString = readFile(fullpath);
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error((error as Error).message);
  }
}

export function clone(object: any) {
  return JSON.parse(JSON.stringify(object));
}

export function writeFile(fullpath: string, data: any) {
  fs.writeFileSync(fullpath, data);
}

export function readFile(fullpath: string) {
  return fs.readFileSync(fullpath, "utf8");
}

export enum SettingsType {
  user = "user",
  workspace = "workspace",
  local = "local",
}

export function saveSettings(message: any, type: SettingsType) {
  let originalMessage: any;
  try {
    originalMessage = readJsonFile(settingsPath);
  } catch (err) {
    console.log("Settings file not available, will create it");
  }
  if (!originalMessage) {
    originalMessage = {};
  }

  if (originalMessage[type]) {
    if(type === SettingsType.workspace) {
      let messageKey = Object.keys(message)[0];
      if(Object.keys(originalMessage[type]).indexOf(messageKey) >= 0) {
        Object.assign(originalMessage[type][messageKey], message[messageKey]);
      } else {
        Object.assign(originalMessage[type], message);
      }
    } else if (type === SettingsType.user) {
      Object.assign(originalMessage[type], message);
    } else if (type === SettingsType.local) {
      originalMessage[type] = message;
    }
  } else {
    originalMessage[type] = message;
  }
  writeJsonFile(settingsPath, originalMessage);
}

export function clearSettings(type: SettingsType) {
  let originalMessage = readJsonFile(settingsPath);
  originalMessage[type] = {};
  writeJsonFile(settingsPath, originalMessage);
}

// export function clearTempFiles(filename: string) {
//   fs.unlink(filename);
// }

export function getSettings(type: SettingsType) {
  let originalMessage = readJsonFile(settingsPath);
  return originalMessage[type];
}

export function doesFileExists(filePath: string) {
  return fs.existsSync(filePath);
}

export function getLogger() {
  return outputLogger;
}