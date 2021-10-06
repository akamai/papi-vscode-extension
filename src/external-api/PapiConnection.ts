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

import { Authentication } from "./Authentication";
import * as os from "os";
import { OpenClient } from "./OpenClient";
import * as _ from "underscore";

export class PapiConnection {
  private openClient: OpenClient;

  constructor(
    authentication: Authentication,
    accountSwitchKey: string | undefined
  ) {
    this.openClient = new OpenClient({}, authentication, accountSwitchKey);
  }

  public listGroups(callback: any = undefined) {
    return this.openClient.get(`/papi/v1/groups`, callback);
  }

  public listProducts(contractId: string, callback: any = undefined) {
    return this.openClient.get(
      `/papi/v1/products?contractId=${contractId}`,
      callback
    );
  }

  public getPmSettings(callback: any = undefined) {
    return this.openClient.get(`/pm-settings/default`, callback);
  }

  public getProperty(name: string) {
    let url = `/papi/v1/search/find-by-value`;
    let searchBody = {
      propertyName: name,
    };
    return this.openClient.post(url, searchBody);
  }

  public getPropertyVersionRules(
    propertyId: string,
    propertyVersion: number,
    ruleFormat: string | undefined = undefined,
    callback: any = undefined
  ): Promise<any> {
    let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/rules`;
    let headers: any = {};
    if (_.isString(ruleFormat)) {
      headers.Accept = `application/vnd.akamai.papirules.${ruleFormat}+json`;
    }
    return this.openClient.get(url, headers, callback);
  }

  public getPapiSchema(
    productId: string,
    ruleFormat: string = "latest",
    callback: any = undefined
  ) {
    let url = `/papi/v0/schemas/products/${productId}/${ruleFormat}`;
    return this.openClient.get(url, callback);
  }

  public listAvailableBehaviors(
    propertyId: string,
    propertyVersion: number,
    callback: any = undefined
  ): Promise<any> {
    let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/available-behaviors`;
    return this.openClient.get(url, callback);
  }

  public listAvailableCriterias(propertyId: string, propertyVersion: number,callback: any = undefined): Promise<any> {
    let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/available-criteria`;
    return this.openClient.get(url, callback);
  }

  public listCpcodes(contractId: string, groupId: string, callback: any = undefined) {
    let url = `/papi/v1/cpcodes?contractId=${contractId}&groupId=${groupId}`;
    return this.openClient.get(url, callback);
  }

  public getExternalResources(propertyId: string, propertyVersion: number, callback: any = undefined) {
    let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/external-resources`;
    return this.openClient.get(url, callback);
  }

  public validateRules(
    contractId: string,
    groupId: string,
    rules: any,
    ruleFormat: string = "latest",
    callback: any = undefined
  ) {
    let url = `/papi/v1/validate/rules?contractId=${contractId}&groupId=${groupId}`;
    return this.openClient.post(url, rules, callback);
  }

  public validatePropertyRules(
    propertyId: number,
    propertyVersion: number,
    rules: any,
    ruleFormat: string = "latest",
    callback: any = undefined
  ) {
    let url = `/papi/v1/properties/${propertyId}/versions/${propertyVersion}/rules?dryRun=true&validateMode=fast`;
    let headers: any = {};
    if (_.isString(ruleFormat)) {
      headers[
        "Content-Type"
      ] = `application/vnd.akamai.papirules.${ruleFormat}+json`;
      headers.Accept = `application/vnd.akamai.papirules.${ruleFormat}+json`;
    }
    return this.openClient.put(url, rules, headers, callback);
  }
}
