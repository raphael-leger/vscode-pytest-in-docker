import * as vscode from 'vscode';
import { extname, dirname } from 'path';

const PYTEST_PATTERN = "{PYTEST}";

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	console.log('Pytest-in-Docker extension activated.');
	const commandId = 'pytest-in-docker.runPytestInDocker';

	let disposable = vscode.commands.registerCommand(commandId, () => {
		const pytestTerminalName: string = vscode.workspace.getConfiguration().get('pytestInDocker.terminalName') || 'Pytest in Docker';
		const commandToLaunchContainer: string = vscode.workspace.getConfiguration().get('pytestInDocker.commandToLaunchContainer') || "";
		const rootFolder: string | undefined = vscode.workspace.getConfiguration().get('pytestInDocker.rootFolder') || undefined;
		const flags: string = vscode.workspace.getConfiguration().get('pytestInDocker.flags') || "";
		const emoji: string = vscode.workspace.getConfiguration().get('pytestInDocker.emoji') || "🐹";

		const { terminals } = vscode.window;

		let testTerminal = terminals.find(terminal => terminal.name === pytestTerminalName);
		if (!testTerminal) {
			testTerminal = vscode.window.createTerminal(pytestTerminalName);
		}

		if (vscode.window.activeTextEditor) {
			const filePath = vscode.window.activeTextEditor.document.uri.fsPath;

			let directory = '';
			if (vscode.workspace.workspaceFolders) {
				directory = dirname(vscode.workspace.workspaceFolders[0].uri.fsPath);
			}

			if (rootFolder === undefined) {
				vscode.window.showErrorMessage(`You need to open Visual Studio Code settings and add the following setting: 'pytestInDocker.rootFolder'.`);
			}

			const [_, filePathRelativeToRoot] = filePath.split(`${rootFolder}/`);

			if (filePathRelativeToRoot && extname(filePathRelativeToRoot) === ".py") {
				if (!commandToLaunchContainer) {
					vscode.window.showErrorMessage(`You need to open Visual Studio Code settings and add the following setting: 'pytestInDocker.commandToLaunchContainer'.`);
				}
				if (commandToLaunchContainer.indexOf(PYTEST_PATTERN) === -1) {
					vscode.window.showErrorMessage(`The setting 'pytestInDocker.commandToLaunchContainer' needs to contain the pattern ${PYTEST_PATTERN} to launch pytest.`);
				}

				const commandToLaunchContainerAndPytest = commandToLaunchContainer.replace(PYTEST_PATTERN, `pytest \"${filePathRelativeToRoot}\" ${flags}`);
				const displayCommand = `echo "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}\nLaunching pytest in Docker\n${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}${emoji}\n\n"`;

				testTerminal.sendText(displayCommand);

				if (rootFolder) {
					testTerminal.sendText(`[ ! -f /.dockerenv ] && cd ${directory} && cd ${rootFolder} && ${commandToLaunchContainerAndPytest}`);
				} else {
					testTerminal.sendText(`[ ! -f /.dockerenv ] && cd ${directory} && ${commandToLaunchContainerAndPytest}`);
				}

				testTerminal.sendText(`[ -f /.dockerenv ] && pytest "${filePathRelativeToRoot}" ${flags}`);
			} else {
				vscode.window.showErrorMessage(`You need to be within a python test file to launch pytest in Docker.`);
			}
		}
	});

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = commandId;
	statusBarItem.text = "Pytest: Run in Docker";
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);
	context.subscriptions.push(disposable);
}

export function deactivate() { }
