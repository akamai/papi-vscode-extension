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

import * as crypto from "crypto";
import * as url from "url";

export function signRequest(
  request: any,
  timestamp: any,
  clientSecret: string,
  authHeader: any,
  maxBody: number
) {
  return base64HmacSha256(
    dataToSign(request, authHeader, maxBody),
    signingKey(timestamp, clientSecret)
  );
}

export function base64HmacSha256(data: any, key: any) {
  let encrypt = crypto.createHmac("sha256", key);
  encrypt.update(data);
  return encrypt.digest("base64");
}

export function dataToSign(request: any, authHeader: any, maxBody: number) {
  let parsedUrl: any = url.parse(request.url, true),
    dataToSign: any = [
      request.method.toUpperCase(),
      parsedUrl.protocol.replace(":", ""),
      parsedUrl.host,
      parsedUrl.path,
      canonicalizeHeaders(request.headersToSign),
      contentHash(request, maxBody),
      authHeader,
    ];
  dataToSign = dataToSign.join("\t").toString();
  // console.debug('Data to sign: "' + dataToSign + '" \n');
  return dataToSign;
}

export function signingKey(timestamp: any, clientSecret: string) {
  let key = base64HmacSha256(timestamp, clientSecret);
  // console.debug('Signing key: ' + key + '\n');
  return key;
}

export function canonicalizeHeaders(headers: any) {
  let formattedHeaders = [],
    key;
  for (key in headers) {
    formattedHeaders.push(
      key.toLowerCase() + ":" + headers[key].trim().replace(/\s+/g, " ")
    );
  }
  return formattedHeaders.join("\t");
}

export function contentHash(request: any, maxBody: number) {
  var contentHash = "",
    preparedBody = request.body || "";

  if (typeof preparedBody === "object") {
    var postDataNew = "",
      key;

    for (key in preparedBody) {
      postDataNew +=
        key + "=" + encodeURIComponent(JSON.stringify(preparedBody[key])) + "&";
    }

    // Strip trailing ampersand
    postDataNew = postDataNew.replace(/&+$/, "");

    preparedBody = postDataNew;
    request.body = preparedBody; // Is this required or being used?
  }

  if (request.method === "POST" && preparedBody.length > 0) {
    // If body data is too large, cut down to max-body size
    if (preparedBody.length > maxBody) {
      console.warn(
        "Data length (" +
          preparedBody.length +
          ") is larger than maximum " +
          maxBody
      );
      preparedBody = preparedBody.substring(0, maxBody);
      console.log('Body truncated. New value "' + preparedBody + '"');
    }

    // console.debug("PREPARED BODY", preparedBody);

    contentHash = base64Sha256(preparedBody);
  }

  return contentHash;
}

export function base64Sha256(data: any) {
  var shasum = crypto.createHash("sha256").update(data);
  return shasum.digest("base64");
}

export function extend(a: any, b: any) {
  let key;
  for (key in b) {
    // console.debug(
    //   `key: ${key}, a[key]: ${JSON.stringify(
    //     a[key]
    //   )}, hasPpty: ${a.hasOwnProperty(key)}`
    // );
    if (!a.hasOwnProperty(key)) {
      a[key] = b[key];
    }
    if (key === "headers") {
      let headers = {};
      Object.assign(headers, b[key], a[key]);
      a[key] = headers;
    }
  }
  return a;
}
