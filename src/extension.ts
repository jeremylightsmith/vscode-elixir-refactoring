import * as vscode from 'vscode';

let terminals: { [key: string]: any } = {};
const TERMINAL_NAME = "Elixir Refactorings";
let lastExecuted = "";

const EXUNIT_COMMAND_KEY = "vscode-elixir-refactoring.exunit-command";
const EXACTO_KNIFE_COMMAND_KEY = "vscode-elixir-refactoring.exacto-knife-command";

function getFilename() {
  return vscode.window.activeTextEditor?.document.uri.path;
}

function getRootDir() {
  return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;
}

function getAsRelativePath(): string {
  const root = getRootDir();
  if (!root) {
    return "";
  }

  let relativePath: string = getFilename()?.replace(root, "") || "";

  if (/^\//.test(relativePath)) {
    relativePath = relativePath.substring(1);
  }

  if (/^lib\//.test(relativePath)) {
    return relativePath;
  } else if (/^test\//.test(relativePath)) {
    return relativePath;
  } else {
    return "";
  }
}

function getTestFilePath() {
  const neutralFile = getAsRelativePath()
    .replace(/(^lib\/|^test\/|_test.exs$|.ex$)/g, "");

  return `test/${neutralFile}_test.exs`;
}

function isTestFolder() {
  return getFilename()?.indexOf("/test/") !== -1;
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
  terminal.show(true);

  lastExecuted = commandText;
}

async function openRelativePath(path: string) {
  // const uri = vscode.Uri.from({scheme: "vsls", path: `${getRootDir()}${path}`});
  const uri = vscode.Uri.file(`${getRootDir()}/${path}`);
  await vscode.commands.executeCommand("vscode.open", uri);
}

async function toggleTestFile() {
  if (isTestFolder()) {
    openRelativePath(getAsRelativePath()
      .replace(/^test\//, "lib/")
      .replace("_test", "")
      .replace(".exs", ".ex"));

  } else {
    openRelativePath(getTestFilePath());
  }
}

function clearTerminal() {
  vscode.window.activeTextEditor?.document.save();
  return vscode.commands.executeCommand("workbench.action.terminal.clear");
}

function getExUnitCommand(): string {
  return vscode.workspace.getConfiguration().get(EXUNIT_COMMAND_KEY) as string;
}

function getRefactorCommand(): string {
  return vscode.workspace.getConfiguration().get(EXACTO_KNIFE_COMMAND_KEY) as string;
}

function runTestFile() {
  let testFilename = getTestFilePath();
  execCommand(`${getExUnitCommand()} ${testFilename}`);
}

function runFocusedTest() {
  let testFilename = getTestFilePath();
  execCommand(`${getExUnitCommand()} ${testFilename}:${getActiveLine()}`);
}

function runLastTestAgain() {
  if (lastExecuted) {
    execCommand(lastExecuted);
  } else {
    vscode.window.showWarningMessage("ExUnit : Not found last command executed");
  }
}

function performRefactoring(name: string) {
  if (!vscode.window.activeTextEditor) { return; }

  vscode.window.activeTextEditor.document.save();
  execCommand(`${getRefactorCommand()} ${name} ${getFilename()}`);
}

async function performRenameRefactoring() {
  if (!vscode.window.activeTextEditor) { return; }

  vscode.window.activeTextEditor.document.save();
  const sel = vscode.window.activeTextEditor.selection.start;

  const newName = await vscode.window.showInputBox({
    placeHolder: "Rename",
    prompt: "Enter the new name",
    value: ""
  });

  if (newName === '') {
    vscode.window.showErrorMessage('A search query is mandatory to execute this action');
  } else if (newName !== undefined) {
    execCommand(`${getRefactorCommand()} rename ${getFilename()} ${sel.line + 1} ${sel.character + 1} ${newName}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
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

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.sortAliases', () => {
      performRefactoring("sort_aliases");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.rename', () => {
      performRenameRefactoring();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.logTheEnvironment', () => {
      console.log("vscode.window.activeTextEditor", vscode.window.activeTextEditor)
      console.log("vscode.window.activeTextEditor?.document.uri", vscode.window.activeTextEditor?.document.uri)
      console.log("vscode.window.activeTextEditor?.document.uri.path", vscode.window.activeTextEditor?.document.uri.path)
      console.log("vscode.workspace.workspaceFolders", vscode.workspace.workspaceFolders)
      console.log("vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri", vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri)
      console.log("vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath", vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath)
      console.log("getAsRelativePath()", getAsRelativePath())
      console.log("getTestFilePath()", getTestFilePath())
    })
  );
}

export function deactivate() { }

vscode.window.onDidCloseTerminal((terminal: vscode.Terminal) => {
  if (terminals[terminal.name]) {
    delete terminals[terminal.name];
  }
});
