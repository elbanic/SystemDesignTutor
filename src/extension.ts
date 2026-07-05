import * as vscode from 'vscode';
import { ServerManager } from './serverManager';
import { executeSyncCommand } from './commands/syncCommand';
import { executeDiagnosticCommand } from './commands/diagnosticCommand';
import { ConfigPanel } from './configPanel';

let serverManager: ServerManager | null = null;

export async function activate(context: vscode.ExtensionContext) {
	console.log('System Design Tutor extension activated');

	serverManager = new ServerManager(context.extensionPath);

	// Start the MCP server
	try {
		await serverManager.start();
		vscode.window.showInformationMessage('System Design Tutor MCP server started');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`Failed to start MCP server: ${errorMessage}`);
		console.error('Failed to start MCP server:', error);
	}

	// Register sync command
	const syncCommand = vscode.commands.registerCommand('systemdesigntutor.syncData', async () => {
		try {
			await executeSyncCommand(context.extensionPath);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Sync failed: ${errorMessage}`);
		}
	});

	// Register config panel command
	const configCommand = vscode.commands.registerCommand('systemdesigntutor.openConfig', () => {
		ConfigPanel.show(context.extensionPath);
	});

	// Register restart server command
	const restartServerCommand = vscode.commands.registerCommand('systemdesigntutor.restartServer', async () => {
		try {
			vscode.window.showInformationMessage('Restarting MCP server...');
			if (serverManager) {
				await serverManager.stop();
				await serverManager.start();
				vscode.window.showInformationMessage('MCP server restarted successfully');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to restart server: ${errorMessage}`);
		}
	});

	// Register diagnostic command
	const diagnosticCommand = vscode.commands.registerCommand('systemdesigntutor.runDiagnostics', async () => {
		await executeDiagnosticCommand(context.extensionPath);
	});

	// Register view logs command
	const viewLogsCommand = vscode.commands.registerCommand('systemdesigntutor.viewLogs', async () => {
		const path = require('path');
		const fs = require('fs');
		
		// Check both possible locations
		const bundledLogPath = path.join(context.extensionPath, 'python-server', 'mcp_server.log');
		const siblingLogPath = path.join(context.extensionPath, '..', 'python-server', 'mcp_server.log');
		
		let logPath = bundledLogPath;
		if (!fs.existsSync(bundledLogPath) && fs.existsSync(siblingLogPath)) {
			logPath = siblingLogPath;
		}
		
		if (fs.existsSync(logPath)) {
			const doc = await vscode.workspace.openTextDocument(logPath);
			await vscode.window.showTextDocument(doc);
			vscode.window.showInformationMessage(`Viewing logs from: ${logPath}`);
		} else {
			vscode.window.showErrorMessage(`Log file not found. Checked:\n- ${bundledLogPath}\n- ${siblingLogPath}`);
		}
	});

	context.subscriptions.push(syncCommand);
	context.subscriptions.push(configCommand);
	context.subscriptions.push(restartServerCommand);
	context.subscriptions.push(diagnosticCommand);
	context.subscriptions.push(viewLogsCommand);
	context.subscriptions.push({
		dispose: () => {
			if (serverManager) {
				serverManager.dispose();
			}
		}
	});
}

export async function deactivate() {
	console.log('System Design Tutor extension deactivating');
	
	if (serverManager) {
		await serverManager.stop();
		serverManager = null;
	}
	
	console.log('System Design Tutor extension deactivated');
}
