// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface IUnfurlSnip {
  label: string;
  description?: string;
  snippet: string;
}

interface IUnfurlConfig {
  [id: string]: IUnfurlSnip;
}

const applyUnfurlSnip = (id: string) => {
  let unfurlConfig: IUnfurlConfig = getUnfurlConfig();
  if (vscode.window.activeTextEditor && unfurlConfig[id]) {
    const snip: IUnfurlSnip = unfurlConfig[id];
    vscode.window.activeTextEditor.insertSnippet(
      new vscode.SnippetString(snip.snippet)
    );
  }
};

const registerCmds = async (
  context: vscode.ExtensionContext,
  unfurlConfig: IUnfurlConfig,
  oldUnfurlConfig: IUnfurlConfig
  // ufcustomConfig: IUnfurlConfig
) => {
  await vscode.commands.getCommands().then((cmdList) => {
    Object.keys(unfurlConfig).forEach((id) => {
      const cmdId = `unfurl.${id}`;
      const cusCmdId = `${id}`;

      let hasCmd = cmdList.indexOf(cmdId) != -1;
      let hasCusCmd = cmdList.indexOf(cusCmdId) != -1;
      //apply snippet if the command changed
      if (hasCmd || hasCusCmd) {
        hasCmd &&
          JSON.stringify(oldUnfurlConfig[id]) !==
            JSON.stringify(unfurlConfig[id]) &&
          vscode.window.activeTextEditor!.insertSnippet(
            new vscode.SnippetString(unfurlConfig[id].snippet)
          );

        hasCusCmd &&
          JSON.stringify(oldUnfurlConfig[id]) !==
            JSON.stringify(unfurlConfig[id]) &&
          vscode.window.activeTextEditor!.insertSnippet(
            new vscode.SnippetString(unfurlConfig[id].snippet)
          );
      }

      if (!hasCmd || !hasCusCmd) {
        !hasCmd &&
          context.subscriptions.push(
            vscode.commands.registerCommand(cmdId, () => applyUnfurlSnip(id))
          );
        !hasCusCmd &&
          context.subscriptions.push(
            vscode.commands.registerCommand(cusCmdId, () => applyUnfurlSnip(id))
          );
      }
    });
  });
  // await vscode.commands.getCommands().then(() => {
  // 	Object.keys(ufcustomConfig).forEach((id) => {
  // 		const cmdId = `${id}`;
  // 		context.subscriptions.push(
  // 			vscode.commands.registerCommand(cmdId, () =>
  // 				applyUnfurlSnip(id, ufcustomConfig))
  // 		);

  // 	});
  // });
};

const trimSelection = (
  selection: vscode.Selection
): vscode.Selection | undefined => {
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && selection) {
    const startLine = selection.start.line;
    const endLine = selection.end.line;

    let startPosition: vscode.Position | undefined = undefined;
    let endPosition: vscode.Position | undefined = undefined;

    for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
      const line = activeEditor.document.lineAt(lineNo);
      if (line.isEmptyOrWhitespace) {
        continue;
      }

      if (
        lineNo > startLine &&
        lineNo === endLine &&
        selection.end.character < line.firstNonWhitespaceCharacterIndex
      ) {
        continue;
      }

      if (!startPosition) {
        // find start character index
        let startCharacter = line.firstNonWhitespaceCharacterIndex;

        if (lineNo === startLine) {
          startCharacter = Math.max(startCharacter, selection.start.character);
        }

        startPosition = new vscode.Position(lineNo, startCharacter);
      }

      // find end character index
      let endCharacter =
        line.firstNonWhitespaceCharacterIndex + line.text.trim().length;

      if (lineNo === endLine) {
        endCharacter = Math.min(endCharacter, selection.end.character);
      }

      endPosition = new vscode.Position(lineNo, endCharacter);
    }

    if (startPosition && endPosition) {
      return new vscode.Selection(startPosition, endPosition);
    }
  }

  return undefined;
};

const trimSelections = (): void => {
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.selections) {
    const selections: vscode.Selection[] = [];

    activeEditor.selections.forEach((selection) => {
      if (
        selection.start.line === selection.end.line &&
        selection.start.character === selection.end.character
      ) {
        return false;
      }

      const trimmedSelection = trimSelection(selection);
      if (trimmedSelection) {
        selections.push(trimmedSelection);
      }
    });

    activeEditor.selections = selections;
  }
};

const applyQuickPick = (
  qPick: vscode.QuickPickItem,
  unfurlSnips: IUnfurlSnip[]
) => {
  const activeEditor = vscode.window.activeTextEditor;

  if (activeEditor && qPick) {
    const unfurlSnip = unfurlSnips.find((s) => qPick.label === s.label);
    if (unfurlSnip) {
      try {
        trimSelections();
        activeEditor.insertSnippet(
          new vscode.SnippetString(unfurlSnip.snippet)
        );
      } catch (err) {
        vscode.window.showErrorMessage(
          'Could not apply unfurl snippet: ' + unfurlSnip.label,
          String(err)
        );
      }
    }
  }
};

const getUnfurlConfig = () => {
  return {
    ...(<IUnfurlConfig>vscode.workspace.getConfiguration('unfurl')),
    ...(<IUnfurlConfig>vscode.workspace.getConfiguration('ufcustom')),
  };
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let unfurlSnips: IUnfurlSnip[] = [];
  let unfurlConfig: IUnfurlConfig = <IUnfurlConfig>getUnfurlConfig();
  // let ufcustomConfig: IUnfurlConfig = <IUnfurlConfig>vscode.workspace.getConfiguration("ufcustom");
  let disposable1: vscode.Disposable;
  let disposable2: vscode.Disposable;

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "vscode-yuhacks-unfurl" is now active!',
    unfurlConfig
  );

  function update() {
    let oldUnfurlConfig = { ...unfurlConfig };
    unfurlConfig = getUnfurlConfig();
    // ufcustomConfig = <IUnfurlConfig>vscode.workspace.getConfiguration("ufcustom");
    unfurlSnips = [];

    Object.keys(unfurlConfig).forEach((id) => {
      unfurlSnips.push(unfurlConfig[id]);
    });

    // Object.keys(ufcustomConfig).forEach((id) => {

    // 	unfurlSnips.push(ufcustomConfig[id]);

    // });

    registerCmds(context, unfurlConfig, oldUnfurlConfig);

    const handler = async () => {
      let qPicks = unfurlSnips.map(({ label, description }) => {
        return {
          label,
          description,
        };
      });

      const qPick = await vscode.window.showQuickPick(qPicks, {
        placeHolder: 'Snippet label:',
        matchOnDescription: true,
      });

      if (!qPick) {
        return;
      }

      applyQuickPick(qPick, unfurlSnips);
    };

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    disposable1 = vscode.commands.registerCommand('unfurl', () => handler());
    disposable2 = vscode.commands.registerCommand('ufcustom', () => handler());
  }

  vscode.workspace.onDidChangeConfiguration(() => {
    update();
  });

  update();

  context.subscriptions.push(disposable1!);
  context.subscriptions.push(disposable2!);
}

// this method is called when your extension is deactivated
export function deactivate() {}
