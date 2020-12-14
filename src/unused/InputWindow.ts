import { window } from "vscode";

let inputBoxOptions = {
  value: undefined,
  placeHolder: "propertyId",
  prompt: "propertyId",
  ignoreFocusOut: true,
  validateInput(value: string) {
    return value;
  },
};

const acceptInput = window.showInputBox(inputBoxOptions);

/**
 * Shows an input box using window.showInputBox().
 */
export async function showInputBox() {
  const result = await window.showInputBox({
    value: "abcdef",
    valueSelection: [2, 4],
    placeHolder: "For example: fedcba. But not: 123",
    validateInput: (text) => {
      window.showInformationMessage(`Validating: ${text}`);
      return text === "123" ? "Not 123!" : null;
    },
  });
  window.showInformationMessage(`Got: ${result}`);
}

/**
 * Shows a pick list using window.showQuickPick().
 */
export async function showQuickPick() {
  let i = 0;
  const result = await window.showQuickPick(["eins", "zwei", "drei"], {
    placeHolder: "eins, zwei or drei",
    onDidSelectItem: (item) =>
      window.showInformationMessage(`Focus ${++i}: ${item}`),
  });
  window.showInformationMessage(`Got: ${result}`);
}
