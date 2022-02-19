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


const applyUnfurlSnip = (id: string, unfurlConfig: IUnfurlConfig) => {
	if (vscode.window.activeTextEditor && unfurlConfig[id]) {
		const surroundItem: IUnfurlSnip = unfurlConfig[id];
		vscode.window.activeTextEditor.insertSnippet(
			new vscode.SnippetString(surroundItem.snippet)
		);
	};
}



const registerCmds = (
	context: vscode.ExtensionContext,
	unfurlConfig: IUnfurlConfig
) => {
	vscode.commands.getCommands().then((cmdList) => {
		Object.keys(unfurlConfig).forEach((id) => {
			const cmdId = `unfurl.${id}`;
			if (cmdList.indexOf(cmdId) === -1) {
				context.subscriptions.push(
					vscode.commands.registerCommand(cmdId, () =>
						applyUnfurlSnip(id, unfurlConfig))
				);
			}
		});
	});
}


const trimSelection = (selection: vscode.Selection): vscode.Selection | undefined => {
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
}

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
}

const applyQuickPick = (qPick: vscode.QuickPickItem, unfurlSnips: IUnfurlSnip[]) => {
	const activeEditor = vscode.window.activeTextEditor;

	if (activeEditor && qPick) {
		const unfurlSnip = unfurlSnips.find((s) => qPick.label === s.label);
		if (unfurlSnip) {
			try {
				trimSelections();
				activeEditor.insertSnippet(new vscode.SnippetString(unfurlSnip.snippet));
			} catch (err) {
				vscode.window.showErrorMessage(
					"Could not apply surround snippet: " + unfurlSnip.label,
					String(err)
				);
			}
		}
	}
}



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let unfurlSnips: IUnfurlSnip[] = [];
	let unfurlConfig: IUnfurlConfig = <IUnfurlConfig>vscode.workspace.getConfiguration("unfurl");



	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-yuhacks-unfurl" is now active!', unfurlConfig);


	function update() {
		unfurlConfig = <IUnfurlConfig>vscode.workspace.getConfiguration("unfurl");
		unfurlSnips = [];

		Object.keys(unfurlConfig).forEach((id) => {

			unfurlSnips.push(unfurlConfig[id]);

		});


		registerCmds(context, unfurlConfig);
	}

	vscode.workspace.onDidChangeConfiguration(() => {
		update();
	});

	update();

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('unfurl', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user

		let qPicks = unfurlSnips.map(({ label, description }) => {
			return {
				label,
				description
			};
		});

		const qPick = await vscode.window.showQuickPick(qPicks, {
			placeHolder: "Snippet label:",
			matchOnDescription: true,
		});

		if (!qPick) {
			return;
		}

		applyQuickPick(qPick, unfurlSnips);
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }