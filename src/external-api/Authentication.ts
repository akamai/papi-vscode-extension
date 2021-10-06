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

import { signRequest } from "./AuthHelper";
import { EdgercSection } from "../startup-page/InputHelper";
import * as _ from "underscore";
import * as moment from "moment";
import * as url from "url";
import * as uuid from "uuid";

export class Authentication {
  private section: EdgercSection;

  constructor(section: EdgercSection) {
    // console.debug(section);
    this.section = section;
  }

  public addAuthorization(
    request: any,
    maxBody: number = 131072,
    guid = uuid.v4(),
    timestamp = moment().utc().format("YYYYMMDDTHH:mm:ss+0000")
  ) {
    if (!request.hasOwnProperty("headers")) {
      request.headers = {};
    }
    request.url = this.makeURL(request.path, request.qs);
    request.headers.Authorization = this.makeAuthHeader(
      request,
      timestamp,
      guid,
      maxBody
    );
    return request;
  }

  private makeURL(path: string, queryStringObj: any) {
    var parsed = url.parse(this.section.host + path, true);
    if (queryStringObj) {
      parsed.query = queryStringObj;
    }
    return url.format(parsed);
  }

  private makeAuthHeader(
    request: any,
    timestamp: any,
    nonce: any,
    maxBody: any
  ) {
    let keyValuePairs: any = {
        client_token: this.section.clientToken,
        access_token: this.section.accessToken,
        timestamp: timestamp,
        nonce: nonce,
      },
      joinedPairs = "",
      authHeader,
      signedAuthHeader,
      key;

    for (key in keyValuePairs) {
      joinedPairs += key + "=" + keyValuePairs[key] + ";";
    }
    authHeader = "EG1-HMAC-SHA256 " + joinedPairs;
    // console.debug("Unsigned authorization header: " + authHeader + "\n");
    signedAuthHeader =
      authHeader +
      "signature=" +
      signRequest(
        request,
        timestamp,
        this.section.clientSecret,
        authHeader,
        maxBody
      );
    return signedAuthHeader;
  }
}
