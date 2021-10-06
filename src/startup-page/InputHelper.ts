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

import * as FileHelper from "../FileHelper";
import * as _ from "underscore";

const SECTION_PATTERN = /^\s*\[(.*)]/;

export interface EdgercSection {
  host: string;
  clientSecret: string;
  accessToken: string;
  clientToken: string;
}

export interface Credentials {
  edgercSection: EdgercSection;
  accountSwitchKey: string | undefined;
}

export enum MessageFromWeb {
  documentReady = "documentReady",
  postEdgerc = "postEdgerc",
  postEdgercSection = "postEdgercSection",
  searchProperty = "searchProperty",
  downloadRules = "downloadRules",
  userLocalRules = "userLocalRules",
  validateRules = "validateRules",
  getGroups = "getGroups",
  getProducts = "getProducts",
  getProductId = "getProductId",
  validateWithServer = "validateWithServer",
}

export enum MessageFromExt {
  configureEdgerc = "configureEdgerc",
  edgercConfigured = "edgercConfigured",
  acceptSectionName = "acceptSectionName",
  acceptPropertyVersion = "acceptPropertyVersion",
  setRulesFiles = "setRulesFiles",
  setProductNFormat = "setProductNFormat",
  setGroups = "setGroups",
  setProducts = "setProducts",
}

export function getEdgercFromSettings(): Credentials {
  try {
    let userSettings = FileHelper.getSettings(FileHelper.SettingsType.user);
    if (userSettings.edgercSection) {
      return {
        edgercSection: userSettings.edgercSection,
        accountSwitchKey: userSettings.accountSwitchKey,
      };
    } else {
      throw new Error("No edgercSection in settings");
    }
  } catch (err) {
    throw new Error(err);
  }
}

export function setEdgercInSettings(
  edgercSection: EdgercSection,
  accountSwitchKey: string | undefined
): void {
  FileHelper.saveSettings(
    { edgercSection: edgercSection, accountSwitchKey: accountSwitchKey },
    FileHelper.SettingsType.user
  );
}

const _keyMap: any = {
  client_token: "clientToken",
  client_secret: "clientSecret",
  access_token: "accessToken",
};

export function parseEdgerc(edgerc: string) {
  const lines = edgerc.split("\n");
  let sections: any = {};

  _.each(lines, function (line, lineNumber) {
    line = line.trim();
    if (line === "") {
      return;
    }
    let sectionMatch = SECTION_PATTERN.exec(line);
    if (sectionMatch) {
      let sectionName = sectionMatch[1];
      let sectionLines = extractSectionLines(lines, lineNumber + 1);
      let section = buildSection(sectionLines);
      sections[sectionName] = section;
    }
  });
  return sections;
}

// inserts the section into this.sections
function extractSectionLines(lines: string[], lineNumber: number): string[] {
  let sectionLines: string[] = [];
  // collect all the lines until the beginning of the next section
  for (let i = lineNumber; i < lines.length; i++) {
    let nextSectionMatch = SECTION_PATTERN.exec(lines[i]);
    if (nextSectionMatch) {
      break;
    }
    sectionLines.push(lines[i]);
  }
  return sectionLines;
}

// build section object for the lines specific to the section
function buildSection(sectionLines: string[]) {
  let section: any = {};
  sectionLines.forEach(function (line) {
    // Remove comment lines
    if (line.startsWith("#") || line.startsWith("//")) {
      return;
    }
    line = line.trim();
    let index = line.indexOf("=");
    if (index > -1) {
      let key = line.slice(0, index).trim();
      let val = line.slice(index + 1).trim();

      // Remove trailing slash as if often found in the host property
      val = val.replace(/\/$/, "");
      // Add https: in front of hostname
      if (key === "host" && val.indexOf("https://") < 0) {
        val = "https://" + val;
      }
      key = _.isString(_keyMap[key]) ? _keyMap[key] : key;
      section[key] = val;
    }
  });
  return section;
}

export function displayError(response: any, resolve: any, reject: any): void {}
