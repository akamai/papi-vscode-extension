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
import { getLogger } from "../FileHelper";

export const PAPI_MODE: vscode.DocumentFilter = {
  language: "json",
  scheme: "file",
};

export interface PapiDefinitionInformation {
  line: number;
  column: number;
  name: string;
}

export class PapiDefinitionProvider implements vscode.DefinitionProvider {
  private definingDocument: vscode.TextDocument;

  constructor(definingDocument: vscode.TextDocument) {
    this.definingDocument = definingDocument;
  }

  public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Location> {
    return this.definitionLocation(document, position, token).then(
      (definitionInfo: PapiDefinitionInformation) => {
        if (definitionInfo === null) {
          return Promise.reject("Could not find definition file");
        }
        const definitionResource = this.definingDocument?.uri;
        const pos = new vscode.Position(
          definitionInfo.line,
          definitionInfo.column
        );
        return new vscode.Location(definitionResource, pos);
      },
      (err) => {
        return Promise.reject(err);
      }
    );
  }

  definitionLocation(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<PapiDefinitionInformation> {
    const keys = this.getLocationKeys(document, position);
    if (keys) {
      // getLogger().appendLine(`Keys: ${JSON.stringify(keys)}`);
      let keyIndex = 0;
      let inValueZone = false;
      let arrayCounter = new Map<number, number>();
      const lineCount: number = this.definingDocument.lineCount;
      let charStack: string[] = [];

      for (let i = 0; i < lineCount; i++) {
        let line: string = this.definingDocument.lineAt(i).text;
        for (let j = 0; j < line.length; j++) {
          // getLogger().appendLine(`keyIndex: ${keyIndex}, charStack: ${JSON.stringify(charStack)}`);
          switch (line.charAt(j)) {
            case '[':
              charStack.push(line.charAt(j));
              inValueZone = false;
              break;
            case '{':
              if(this._isNumber(keys[keyIndex]) && charStack[charStack.length-1] === '[') {
                let arrayNumber: number | undefined = arrayCounter.get(charStack.length);
                if(arrayNumber != undefined) {
                  arrayNumber++;
                  arrayCounter.set(charStack.length, arrayNumber);
                } else {
                  arrayCounter.set(charStack.length, 0);
                }
                // getLogger().appendLine(`arrayCounter: ${JSON.stringify(arrayCounter)}`);
                if(!inValueZone && keyIndex+1 === charStack.length && 
                  arrayCounter.get(charStack.length) === parseInt(keys[keyIndex])) {
                  keyIndex++;
                  if(keyIndex === keys.length && keyIndex === charStack.length) {
                    return Promise.resolve({ line: i, column: j, name: "Error/Warning Location" });
                  }
                }
              }
              charStack.push(line.charAt(j));
              inValueZone = false;
              break;
            case '}':
              charStack.pop();
              inValueZone = false;
              break;
            case ']':
              arrayCounter.delete(charStack.length);
              charStack.pop();
              inValueZone = false;
              break;
            case ',':
              inValueZone = false;
              break;
            case ':':
              inValueZone = true;
              break;
            case '"':
              if(!inValueZone && !this._isNumber(keys[keyIndex]) && charStack[charStack.length-1] === '{' &&
              keyIndex+1 === charStack.length && this.isKey(line, j+1, keys[keyIndex])) {
                // Inside the object and 
                keyIndex++;
                if(keyIndex === keys.length && keyIndex === charStack.length) {
                  return Promise.resolve({ line: i, column: j, name: "Error/Warning Location" });
                }
              }
              //assuming quote ends in teh same line, else return the end of the line
              j = this.moveOutofQuotes(line, j);
              break;
          }
        }
      }
    }      
    return Promise.reject("Didn't match the pattern");
  }

  isKey(line: string, pos: number, key: string) {
    try {
      // getLogger().appendLine(line.substr(pos, key.length));
      return line.substr(pos, key.length) === key;
    } catch(error) {
      return false;
    }
  }

  getLocationKeys(document: vscode.TextDocument, position: vscode.Position) {
    let line: string = document.lineAt(position.line).text.trim();
    let locationString: string = line.split(":")[1].trim();
    if (locationString.startsWith('"#')) {
      locationString = locationString.substring(1, locationString.length - 2);
      let errorTypeString = document
        .lineAt(position.line - 1)
        .text.trim()
        .split(":")[2]
        .trim()
        .split('"')[0];
      let keys: string[] = locationString.split("/");
      keys.shift();
      if (errorTypeString === "//problems.luna.akamaiapis.net/papi/v0/validation/attribute_required") {
        keys.pop();
      }
      return keys;
    }
  }

  moveOutofQuotes(line: string, pos: number) {
    // not the start of the quote
    if(line.length-1 === pos) {
      return pos;
    }
    for(let i = pos + 1; i < line.length; i++) {
      if(line.charAt(i) === '"') {
        if(!this._isEscapedQuote(line, i)) {
          return i;
        }
      }
    }
    //couldn't find end quote, returning end of line
    return line.length-1;
  }

  _isEscapedQuote(line: string, pos: number) {
    let i = pos;
    while (0 < i && line[i-1] == "\\") {
      i--;
    }
    if (this._isEven(pos - i)) {
      return false;
    } else {
      return true;
    }
  }

  _isNumber(s: string) {
      if (typeof s != "string") { return false };
      return !isNaN(parseFloat(s));
  }

  _isEven(n: number) {
    return n%2 === 0;
  }
  _isOdd(n: number) {
    return !this._isEven(n);
  }
}
