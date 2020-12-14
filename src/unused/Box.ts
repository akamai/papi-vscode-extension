import * as vscode from "vscode";
import * as _ from "underscore";
import { resolve } from "path";
import { reject } from "underscore";

/**
 * Shows a pick list using window.showQuickPick().
 */
export async function setupEdgeRC() {
  let i = 0;
  const result = await vscode.window.showQuickPick(["eins", "zwei", "drei"], {
    placeHolder: "eins, zwei or drei",
    onDidSelectItem: (item) =>
      vscode.window.showInformationMessage(`Focus ${++i}: ${item}`),
  });
  vscode.window.showInformationMessage(`Got: ${result}`);
}

/**
 * Shows an input box using window.showInputBox().
 */
export async function importFromPapi() {
  const result = await vscode.window.showInputBox({
    value: "property ID",
    // value: '609774',
    valueSelection: [0, 11],
    placeHolder: "property ID",
  });
  if (_.isString(result)) {
    console.log(result);
    vscode.window.showInformationMessage(`Fetching property: ${result}`);
    resolve(result);
  } else {
    reject(new Error("Unable to fetch Property"));
  }
}
