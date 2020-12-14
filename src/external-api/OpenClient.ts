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

import * as _ from "underscore";
import { Authentication } from "./Authentication";
import * as request from "request";
import * as AuthHelper from "./AuthHelper";
import * as url from "url";
import * as vscode from "vscode";

export class OpenClient {
  private headers: any;
  private authN: Authentication;
  private accountSwitchKey: string | undefined;

  constructor(
    headers = {},
    authN: Authentication,
    accountSwitchKey: string | undefined = undefined
  ) {
    this.headers = headers;
    this.authN = authN;
    this.accountSwitchKey = accountSwitchKey;
  }

  public get(
    path: string,
    headers: any = undefined,
    callback: any = undefined
  ): Promise<any> {
    return this.request("GET", path, null, headers, callback);
  }
  public post(
    path: string,
    body: any,
    headers: any = undefined,
    callback = undefined
  ): Promise<any> {
    return this.request("POST", path, body, headers, callback);
  }

  public put(
    path: string,
    body: any,
    headers: any = undefined,
    callback = undefined
  ): Promise<any> {
    return this.request("PUT", path, body, headers, callback);
  }

  private request(
    method: any,
    path: string,
    body: any,
    headers: any,
    callback: any
  ): Promise<any> {
    let processResponse = this.processResponse.bind(this);
    let timedPromise = this.timedPromise.bind(this);
    return timedPromise((resolve: any, reject: any) => {
      let request = this.prepare(method, path, body, headers);
      this.authN.addAuthorization(request);
      this.send(request, function (error: any, response: any) {
        processResponse(request, callback, error, response, resolve, reject);
      });
    }, 100000);
  }

  private timedPromise(callback: any, ms: number) {
    return new Promise(function (resolve, reject) {
      // Set up the real work
      callback(resolve, reject);

      // Set up the timeout
      setTimeout(function () {
        reject("Promise timed out after " + ms + " ms");
      }, ms);
    });
  }

  private send(req: any, callback: any) {
    console.debug(`Request: \n${JSON.stringify({ req }, null, 4)}`);
    let handleRedirect = this.handleRedirect.bind(this);
    request(req, function (error: any, response: any, body: any) {
      console.debug(`Response: \n${JSON.stringify(response)}`);
      if (error) {
        callback(error);
        return;
      }
      if ([300, 301, 302, 303, 307].indexOf(response.statusCode) !== -1) {
        handleRedirect(req, response, callback);
        return;
      }
      callback(null, response, body);
    });
  }

  private handleRedirect(request: any, response: any, callback: any) {
    let parsedUrl = url.parse(response.headers["location"]);

    response.headers["authorization"] = undefined;
    request.url = undefined;
    request.path = parsedUrl.path;

    this.authN.addAuthorization(request);
    this.send(request, callback);
  }

  private defineRequest(req: any) {
    req = AuthHelper.extend(req, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "VSCode-Extension v0.9.0",
      },
      followRedirect: false,
      body: "",
    });
    // Convert body object to properly formatted string
    if (req.body) {
      if (typeof req.body === "object") {
        req.body = JSON.stringify(req.body);
      }
    }
  }

  private prepare(method: string, path: string, body: any, headers: any) {
    let request: any = {};
    request.path = this.addAccountSwitchKeytoPath(path);
    request.method = method;
    request.headers = headers;
    // console.debug(request);
    if (method === "POST" || method === "PUT") {
      let headers = { "Content-Type": "application/json" };
      Object.assign(headers, request.headers);
      request.headers = headers;
      request.body = body;
    }
    this.defineRequest(request);
    return request;
  }

  private addAccountSwitchKeytoPath(path: string) {
    if (_.isString(this.accountSwitchKey)) {
      let splitPath = path.split("?");
      if (splitPath.length === 1) {
        //No query parameters
        return path + `?accountSwitchKey=${this.accountSwitchKey}`;
      } else if (splitPath.length === 2) {
        return path + `&accountSwitckKey=${this.accountSwitchKey}`;
      } else {
        throw new Error(`Malformed request path - '${path}'`);
      }
    }
  }

  private processResponse(
    request: any,
    callback: any,
    error: any,
    response: any,
    resolve: any,
    reject: any
  ) {
    if (error) {
      reject(new Error(`Request failed: ${error}`));
    } else if (
      response &&
      response.statusCode >= 200 &&
      response.statusCode < 400
    ) {
      if (callback) {
        //if the caller of the request method wants more control over response handling.
        callback(response, resolve, reject);
      } else {
        try {
          resolve(JSON.parse(response.body));
        } catch (error) {
          reject(error);
        }
      }
    } else {
      console.error(`Request failed, status code: ${response.statusCode}`);
      vscode.window.showInformationMessage(
        `Request failed, status code: ${response.statusCode}` +
          `\nSee console log for details`
      );
      reject(
        new Error(
          `Request failed, status code: ${response.statusCode},` +
            `\nResponse Body: '${response.body}'`
        )
      );
    }
  }
}
