import * as vscode from 'vscode';

let terminals: { [key: string]: any } = {};
const TERMINAL_NAME = "ExUnit Run File";
let lastExecuted = "";

const EXUNIT_COMMAND_KEY = "vscode-elixir-refactoring.exunit-command";
const EXFACTOR_COMMAND_KEY = "vscode-elixir-refactoring.exfactor-command";

function getFilename() {
  return vscode.window.activeTextEditor?.document.uri.path;
}

function getAsRelativePath(): string {
	if (!vscode.workspace.workspaceFolders) {
		return "";
	}

	const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const rootFile: string = getFilename()?.replace(rootPath, "") || "";
  const isLib: boolean = /^\/lib\//.test(rootFile);
  const isTest: boolean = /^\/test\//.test(rootFile);

  if (isTest) {
    const indexOfTestFolder: number = rootFile.indexOf("/test/");
    return rootFile.substr(indexOfTestFolder + 1);
  } else if (isLib) {
    const indexOfLibFolder: number = rootFile.indexOf("/lib/");
    return rootFile.substr(indexOfLibFolder + 1);
  }

  return "";
}

function getFilePath(): string {
  return getAsRelativePath().replace(
    /^(lib\/)|(\.ex)|(\.exs)|(_test.exs)|(test\/)/gi,
    ""
  );
}

function getTestFilePath() {
  return `test/${getFilePath()}_test.exs`;
}

function getOriginalFile(): string {
  return getTestFilePath().replace(/test\/|(_test)/g, "").replace(".exs", ".ex");
}

function isTestFolder() {
  return getFilename()?.indexOf("/test/") !== -1;
}

function getCurrentFilePath() {
  if (isTestFolder()) {
		return getTestFilePath();
	} else {
		return getOriginalFile();
	}
}

function getTerminal() {
  let currentTerminal: vscode.Terminal = terminals[TERMINAL_NAME];

  if (!currentTerminal) {
    terminals[TERMINAL_NAME] = vscode.window.createTerminal(TERMINAL_NAME);
  }

  return terminals[TERMINAL_NAME];
}

function getActiveLine() {
  return vscode.window.activeTextEditor && (vscode.window.activeTextEditor.selection.active.line + 1);
}

function execCommand(commandText: string) {
  let terminal = getTerminal();

  terminal.sendText(commandText);
  terminal.show();

  lastExecuted = commandText;
}

async function toggleTestFile() {
  let uri = vscode.Uri.file(
    `${vscode.workspace.rootPath}/${getCurrentFilePath()}`
  );

  await vscode.commands.executeCommand("vscode.open", uri);
}

function clearTerminal() {
  vscode.window.activeTextEditor?.document.save();
  return vscode.commands.executeCommand("workbench.action.terminal.clear");
}

function getExUnitCommand(): string {
  return vscode.workspace.getConfiguration().get(EXUNIT_COMMAND_KEY) as string;
}

function getExFactorCommand(): string {
  return vscode.workspace.getConfiguration().get(EXFACTOR_COMMAND_KEY) as string;
}

function runTestFile() {
  let testFilename = getTestFilePath();
  let commandText = `${getExUnitCommand()} ${testFilename}`;

  execCommand(commandText);
}

function runFocusedTest() {
  let testFilename = getTestFilePath();
  let commandText = `${getExUnitCommand()} ${testFilename}:${getActiveLine()}`;
  execCommand(commandText);
}

function runLastTestAgain() {
  if (lastExecuted) {
    execCommand(lastExecuted);
  } else {
    vscode.window.showWarningMessage("ExUnit : Not found last command executed");
  }
}

function performRefactoring(name: string) {
  if (!vscode.window.activeTextEditor) {
    return;
  }

  vscode.window.activeTextEditor.document.save();
  execCommand(`${getExFactorCommand()} ${name} ${getFilename()}`);
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "vscode-elixir-refactoring" is now active!');

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.toggleTestFile', toggleTestFile)
	);

	context.subscriptions.push(
    vscode.commands.registerCommand('extension.runTestFile', () => {
      clearTerminal().then(() => runTestFile());
    })
  );

	context.subscriptions.push(
    vscode.commands.registerCommand('extension.runFocusedTest', () => {
      clearTerminal().then(() => {
        if (isTestFolder()) {
          runFocusedTest();
        } else {
          vscode.window.showWarningMessage("ExUnit Line: only test folder");
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.runLastTestAgain', () => {
      clearTerminal().then(() => runLastTestAgain());
    })
  );

  // refactorings
  
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.consolidateAliases', () => {
      performRefactoring("consolidate_aliases");
    })
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.expandAliases', () => {
      performRefactoring("expand_aliases");
    })
  );
}

export function deactivate() {}

vscode.window.onDidCloseTerminal((terminal: vscode.Terminal) => {
  if (terminals[terminal.name]) {
    delete terminals[terminal.name];
  }
});
