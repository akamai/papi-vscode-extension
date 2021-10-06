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
import { DEFINITION_OF, EXTERNAL_RESOURCE_NAMES } from "./SnippetGenerator";
import { getLogger } from "../FileHelper";

export function verifyNodeName( document: vscode.TextDocument, position: vscode.Position): { isMatch: boolean; matchString?: string, pathArray?: any } {
  const offset = document.offsetAt(position);
  const docText = document.getText();
  const stack = jsonPathTo(docText, offset);
  // console.debug(stack);

  if (!stack || stack.length < 3) {
    return { isMatch: false };
  }
  const stackLen = stack.length;
  const nameFrame = stack[stackLen - 2];
  const indexFrame = stack[stackLen - 1];
  let pathString: string = '';
  stack.forEach((frame) => {
    pathString = frame.key? pathString +'\\' + frame.key : pathString +'\\' + frame.index;
  });
  getLogger().appendLine(`${pathString}`);
  if (
    nameFrame.key === DEFINITION_OF.BEHAVIORS &&
    indexFrame.colType === ColType.Array
  ) {
    return { isMatch: true, matchString: DEFINITION_OF.BEHAVIORS };
  } else if (
    nameFrame.key === DEFINITION_OF.CRITERIA &&
    indexFrame.colType === ColType.Array
  ) {
    return { isMatch: true, matchString: DEFINITION_OF.CRITERIA };
  } else if (
    nameFrame.key === DEFINITION_OF.CHILDREN &&
    indexFrame.colType === ColType.Array
  ) {
    return { isMatch: true, matchString: DEFINITION_OF.CHILDREN };
  } else if (
    nameFrame.key === DEFINITION_OF.VARIABLES &&
    indexFrame.colType === ColType.Array
  ) {
    return { isMatch: true, matchString: DEFINITION_OF.VARIABLES };

    //Checking JSON body for inserting external resources
  } else if(stackLen >= 4 && stack[stackLen - 4].key && _.isNumber(stack[stackLen-4].index)) {
      if(stack[stackLen - 4].key?.toLowerCase() === EXTERNAL_RESOURCE_NAMES.cpcode && stack[stackLen - 3].key === 'options' && stack[stackLen - 2].key === 'value' && stack[stackLen - 1].key === 'id') {
        getLogger().appendLine('isCpcode');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.cpcode}
      }
  } else if(stackLen >= 3 && stack[stackLen - 3].key && _.isNumber(stack[stackLen-3].index)) {
      if(stack[stackLen - 3].key?.toLowerCase() === 'origin' && stack[stackLen - 2].key === 'options' && stack[stackLen - 1].key === 'netStorage') {
        getLogger().appendLine('isNetStorage');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.netStorage}
      } else if(stack[stackLen - 3].key === 'originCharacteristics' && stack[stackLen - 2].key === 'options' && stack[stackLen - 1].key === 'awsAccessKeyVersionGuid') {
        getLogger().appendLine('isAwsAccessKeyVersionGuid');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.awsAccessKey}
      } else if(stack[stackLen - 3].key === 'originCharacteristics' && stack[stackLen - 2].key === 'options' && stack[stackLen - 1].key === 'gcsAccessKeyVersionGuid') {
        getLogger().appendLine('isGcsAccessKeyVersionGuid');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.gcsAccessKey}
      } else if(stack[stackLen - 3].key === 'adaptiveAcceleration' && stack[stackLen - 2].key === 'options' && stack[stackLen - 1].key === 'source') {
        getLogger().appendLine('isAdaptiveAcceleration');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.adaptiveAcceleration}
      } else if(stack[stackLen - 3].key === 'segmentedContentProtection' && stack[stackLen - 2].key === 'options' && stack[stackLen - 1].key === 'revokedListId') {
        getLogger().appendLine('isTokenRevocationBlacklist');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.tokenRevocationBlacklist}
      } else if(stack[stackLen - 3].key === 'edgeWorker' && stack[stackLen - 2].key === 'options' && stack[stackLen - 1].key === 'edgeWorkerId') {
        getLogger().appendLine('isEdgeWorker');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.edgeWorker};
      } else if(stack[stackLen - 3].key?.toLowerCase() === 'datastream' && stack[stackLen - 2].key === 'options' && stack[stackLen - 1].key === 'logStreamName') {
        getLogger().appendLine('islogStream');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.logStream}
      } else if(stack[stackLen - 3].key === 'verifyJsonWebTokenForDcp' && stack[stackLen - 2].key === 'options' && stack[stackLen - 1].key === 'jwt') {
        getLogger().appendLine('isJwtKey');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.jwtKey}
      } else if(stack[stackLen - 3].key === 'cloudWrapper' && stack[stackLen - 2].key === 'options' && stack[stackLen - 1].key === 'location') {
        getLogger().appendLine('isCloudWrapperLocation');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.cloudWrapperLocation}
      } else if(stack[stackLen - 3].key === 'customBehavior' && stack[stackLen - 2].key === 'options' && stack[stackLen - 1].key === 'behaviorId') {
        getLogger().appendLine('isCustomBehavior');
        return {isMatch: true, matchString: EXTERNAL_RESOURCE_NAMES.customBehavior}
      }
  } else if ( nameFrame.key === DEFINITION_OF.OPTIONS && 
    nameFrame.colType === ColType.Object && indexFrame.key && stackLen >= 4) {
    let pathArray = {
      0: stack[stackLen-4].key,
      1: stack[stackLen-3].key,
      2: stack[stackLen-1].key
    };
    return { isMatch: true, matchString: DEFINITION_OF.OPTIONS, pathArray };
  }
  return { isMatch: false };
}

export function getJsonValue(
  document: vscode.TextDocument,
  position: vscode.Position
):
  | {
      parentValue?: string;
      value: string;
      definitionOf: DEFINITION_OF;
      type: string;
    }
  | undefined {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const stack = jsonPathTo(text, offset);
  const length = stack.length;
  // console.debug(stack);

  // depth either for the <behavior, criterion> name or option will always be 4 or more
  if (length < 4) {
    return;
  }
  const FrameFour = stack[stack.length - 4];
  const FrameThree = stack[stack.length - 3];
  const FrameTwo = stack[stack.length - 2];
  const FrameOne = stack[stack.length - 1];

  if (
    FrameFour.key === DEFINITION_OF.BEHAVIORS &&
    FrameThree.colType === ColType.Array
  ) {
    if (FrameTwo.colType === ColType.Object && FrameTwo.key === "options") {
      let value = FrameOne.key;
      if (_.isString(value)) {
        // todo: May have to clone the stack before modification, will the control go to the next if else statement?
        stack.pop();
        stack.pop();
        stack.push({ colType: ColType.Object, key: "name" });
        let parentValue = navigateToValue(text, stack);
        if (_.isString(parentValue)) {
          return {
            parentValue: parentValue,
            value: value,
            definitionOf: DEFINITION_OF.BEHAVIORS,
            type: "options",
          };
        }
      }
    }
  } else if (
    FrameFour.key === DEFINITION_OF.CRITERIA &&
    FrameThree.colType === ColType.Array
  ) {
    if (FrameTwo.colType === ColType.Object && FrameTwo.key === "options") {
      let value = FrameOne.key;
      if (_.isString(value)) {
        // todo: May have to clone the stack before modification, will the control go to the next if else statement?
        stack.pop();
        stack.pop();
        stack.push({ colType: ColType.Object, key: "name" });
        let parentValue = navigateToValue(text, stack);
        if (_.isString(parentValue)) {
          return {
            parentValue: parentValue,
            value: value,
            definitionOf: DEFINITION_OF.CRITERIA,
            type: "options",
          };
        }
      }
    }
  }

  if (
    FrameThree.key === DEFINITION_OF.BEHAVIORS &&
    FrameTwo.colType === ColType.Array
  ) {
    if (FrameOne.colType === ColType.Object && FrameOne.key === "name") {
      let value = navigateToValue(text, stack);
      if (_.isString(value)) {
        return {
          value: value,
          definitionOf: DEFINITION_OF.BEHAVIORS,
          type: "name",
        };
      }
    }
  } else if (
    FrameThree.key === DEFINITION_OF.CRITERIA &&
    FrameTwo.colType === ColType.Array
  ) {
    if (FrameOne.colType === ColType.Object && FrameOne.key === "name") {
      let value = navigateToValue(text, stack);
      if (_.isString(value)) {
        return {
          value: value,
          definitionOf: DEFINITION_OF.CRITERIA,
          type: "name",
        };
      }
    }
  }
  return;
}

// gets value pointed by the stack
function navigateToValue(text: string, stack: Frame[]) {
  let jsonObject: any = JSON.parse(text);
  stack.forEach((frame) => {
    if (frame.colType === ColType.Object && frame.key) {
      jsonObject = jsonObject[frame.key];
    } else if (frame.colType === ColType.Array && _.isNumber(frame.index)) {
      jsonObject = jsonObject[frame.index];
    }
  });
  return jsonObject;
}

// Some parts of the below code is used from the following opensource project
// https://github.com/nidu/vscode-copy-json-path
export enum ColType {
  Object,
  Array,
}
interface Frame {
  colType: ColType;
  index?: number;
  key?: string;
}

function jsonPathTo(text: string, offset: number): Frame[] {
  let pos = 0;
  let stack: Frame[] = [];
  let keyNotSet = false;

  // console.debug('jsonPathTo:start', text, offset)
  while (pos < offset) {
    // console.debug('jsonPathTo:step', pos, stack, keyNotSet)
    const startPos = pos;
    switch (text[pos]) {
      case '"':
        const { text: s, pos: newPos } = readString(text, pos);
        // console.debug('jsonPathTo:readString', {s, pos, newPos, keyNotSet, frame: stack[stack.length - 1]})
        if (stack.length) {
          const frame = stack[stack.length - 1];
          if (frame.colType == ColType.Object && keyNotSet) {
            frame.key = s;
            keyNotSet = false;

            //idenitfy behavior/criteria name in an array
            // works only when the name comes before the option
            const len = stack.length;
            if(len >= 3) {
              if(stack[len-3].colType === ColType.Object && 
                (stack[len-3].key === DEFINITION_OF.BEHAVIORS || stack[len-3].key === DEFINITION_OF.CRITERIA)) {
                if(stack[len-2].colType === ColType.Array && stack[len-1].key && stack[len-1].key === 'name') {
                  let valuePos = newPos;
                  while(valuePos < offset) {
                    if(text[valuePos] === '"') {
                      const { text: value, pos: p } = readString(text, valuePos);
                      stack[len-2].key = value;
                      break;
                    }
                    valuePos++;
                  }
                }
              }
            }
          }
        }
        pos = newPos;
        break;
      case "{":
        stack.push({ colType: ColType.Object });
        keyNotSet = true;
        break;
      case "[":
        stack.push({ colType: ColType.Array, index: 0 });
        break;
      case "}":
      case "]":
        stack.pop();
        break;
      case ",":
        if (stack.length) {
          const frame = stack[stack.length - 1];
          if (frame) {
            if (frame.colType == ColType.Object) {
              frame.key = undefined;
              keyNotSet = true;
            } else if (frame.index !== undefined) {
              frame.index++;
            }
          }
        }
        break;
    }
    if (pos == startPos) {
      pos++;
    }
  }
  // console.debug('jsonPathTo:end', {stack})

  return stack;
}

function pathToString(path: Frame[]): string {
  let s = "";
  for (const frame of path) {
    if (frame.colType == ColType.Object) {
      if (frame.key) {
        if (!frame.key.match(/^[a-zA-Z$#@&%~\-_][a-zA-Z\d$#@&%~\-_]*$/)) {
          const key = frame.key.replace('"', '\\"');
          s += `["${frame.key}"]`;
        } else {
          if (s.length) {
            s += ".";
          }
          s += frame.key;
        }
      }
    } else {
      s += `[${frame.index}]`;
    }
  }
  return s;
}

function readString(text: string, pos: number): { text: string; pos: number } {
  let i = pos + 1;
  i = findEndQuote(text, i);
  var textpos = {
    text: text.substring(pos + 1, i),
    pos: i + 1,
  };

  // console.debug('ReadString: text:' + textpos.text + ' :: pos: ' + pos)
  return textpos;
}

function isEven(n: number) {
  return n % 2 == 0;
}

function isOdd(n: number) {
  return !isEven(n);
}

// Find the next end quote
function findEndQuote(text: string, i: number) {
  while (i < text.length) {
    // console.debug('findEndQuote: ' + i + ' : ' + text[i])
    if (text[i] == '"') {
      var bt = i;

      // Handle backtracking to find if this quote is escaped (or, if the escape is escaping a slash)
      while (0 < bt && text[bt-1] == "\\") {
        bt--;
      }
      if (isEven(i - bt)) {
        break;
      }
    }
    i++;
  }

  return i;
}
