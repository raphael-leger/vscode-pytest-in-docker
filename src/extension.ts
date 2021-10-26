import * as vscode from 'vscode';
import { extname, dirname } from 'path';

const PYTEST_PATTERN = "{PYTEST}";
const COMMAND_IS_WITHIN_DOCKER_CONTAINER = "[ -f /.dockerenv ]";
const COMMAND_IS_OUTSIDE_DOCKER_CONTAINER = "[ ! -f /.dockerenv ]";


const getTerminal = (name: string) => {
	const { terminals } = vscode.window;
	const terminal = terminals.find(t => t.name === name);

	if (terminal) {
		return terminal;
	}

	return vscode.window.createTerminal(name);
};

const getConfiguration = () => {
	const pytestTerminalName: string = vscode.workspace.getConfiguration().get('pytestInDocker.terminalName') || 'Pytest in Docker';
	const commandToLaunchContainer: string = vscode.workspace.getConfiguration().get('pytestInDocker.commandToLaunchContainer') || "";
	const rootFolder: string | undefined = vscode.workspace.getConfiguration().get('pytestInDocker.rootFolder') || undefined;
	const flags: string = vscode.workspace.getConfiguration().get('pytestInDocker.flags') || "";
	const emoji: string = vscode.workspace.getConfiguration().get('pytestInDocker.emoji') || "🐹";

	if (rootFolder === undefined) {
		throw Error(`You need to open Visual Studio Code settings and add the following setting: 'pytestInDocker.rootFolder'.`);
	}
	if (!commandToLaunchContainer) {
		throw Error(`You need to open Visual Studio Code settings and add the following setting: 'pytestInDocker.commandToLaunchContainer'.`);
	}
	if (commandToLaunchContainer.indexOf(PYTEST_PATTERN) === -1) {
		throw Error(`The setting 'pytestInDocker.commandToLaunchContainer' needs to contain the pattern ${PYTEST_PATTERN} to launch pytest.`);
	}

	return {
		pytestTerminalName,
		commandToLaunchContainer,
		rootFolder,
		flags,
		emoji
	};
};

const getCurrentFilePath = () => {
	if (vscode.window.activeTextEditor) {
		return vscode.window.activeTextEditor.document.uri.fsPath;
	}

	throw Error(`You need to be within a python test file to launch pytest in Docker.`);
};

const getWorkspaceDirectory = () => {
	if (vscode.workspace.workspaceFolders) {
		return dirname(vscode.workspace.workspaceFolders[0].uri.fsPath);
	}

	throw Error(`You need to be in a workspace to launch pytest in Docker.`);
};

const getRelativeFilePath = (rootFolder: string, filePath: string) => {
	if (!filePath || extname(filePath) !== ".py") {
		throw Error(`You need to be within a python test file to launch pytest in Docker.`);
	}

	const [_, currentFilePathRelativeToRoot] = filePath.split(`${rootFolder}/`);

	return currentFilePathRelativeToRoot;
};

const getCommandToDisplayMessage = (emoji: string) => {
	const emojisBand = new Array(13).fill(emoji).join();
	const carriageReturnsBeforeMessage = new Array(16).fill("\n").join();
	const carriageReturnsAfterMessage = new Array(2).fill("\n").join();
	return `echo "${carriageReturnsBeforeMessage}${emojisBand}\nLaunching pytest in Docker\n${emojisBand}${carriageReturnsAfterMessage}"`;
};

const pytestInDockerCommand = () => {
	try {
		const {
			pytestTerminalName,
			commandToLaunchContainer,
			rootFolder,
			flags,
			emoji
		} = getConfiguration();

		const terminal = getTerminal(pytestTerminalName);
		const currentFilePath = getCurrentFilePath();
		const currentFilePathRelativeToRoot = getRelativeFilePath(rootFolder, currentFilePath);
		const workspaceDirectory = getWorkspaceDirectory();
		const commandToDisplayMessage = getCommandToDisplayMessage(emoji);
		terminal.sendText(commandToDisplayMessage);

		const commandToLaunchContainerAndPytest = commandToLaunchContainer.replace(PYTEST_PATTERN, `pytest \"${currentFilePathRelativeToRoot}\" ${flags}`);

		if (rootFolder) {
			terminal.sendText(`${COMMAND_IS_OUTSIDE_DOCKER_CONTAINER} && cd ${workspaceDirectory} && cd ${rootFolder} && ${commandToLaunchContainerAndPytest}`);
		} else {
			terminal.sendText(`${COMMAND_IS_OUTSIDE_DOCKER_CONTAINER} && cd ${workspaceDirectory} && ${commandToLaunchContainerAndPytest}`);
		}

		terminal.sendText(`${COMMAND_IS_WITHIN_DOCKER_CONTAINER} && pytest "${currentFilePathRelativeToRoot}" ${flags}`);
	} catch (e: any) {
		vscode.window.showErrorMessage(e.message);
	}
};

export function activate(context: vscode.ExtensionContext) {
	const commandId = 'pytest-in-docker.runPytestInDocker';
	const command = vscode.commands.registerCommand(commandId, pytestInDockerCommand);
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = commandId;
	statusBarItem.text = "Pytest: Run in Docker";
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);
	context.subscriptions.push(command);
}

export function deactivate() { }
