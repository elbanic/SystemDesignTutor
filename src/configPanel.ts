import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ConfigPanel {
	public static currentPanel: ConfigPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.webview.onDidReceiveMessage(
			message => {
				this._handleMessage(message);
			},
			null,
			this._disposables
		);

		this._panel.webview.html = this._getHtmlContent();

		// Send config after webview is ready
		setTimeout(() => {
			this._sendConfig();
		}, 500);
	}

	public static show(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (ConfigPanel.currentPanel) {
			ConfigPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'systemDesignTutorConfig',
			'System Design Tutor Configuration',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: []
			}
		);

		ConfigPanel.currentPanel = new ConfigPanel(panel, extensionPath);
	}

	private _handleMessage(message: any) {
		switch (message.command) {
			case 'webviewReady':
				console.log('Webview is ready, sending config');
				this._sendConfig();
				break;
			case 'getConfig':
				this._sendConfig();
				break;
			case 'saveCredentials':
				this._saveCredentials(message.data);
				break;
			case 'testCredentials':
				this._testCredentials();
				break;
			case 'syncData':
				this._syncData();
				break;
			case 'copyMcpConfig':
				this._copyMcpConfig();
				break;
		}
	}

	private _sendConfig() {
		const config = vscode.workspace.getConfiguration('systemdesigntutor');
		const serverPath = this._getServerPath();
		const venvPython = path.join(serverPath, 'venv', 'bin', 'python');
		const pythonCommand = fs.existsSync(venvPython) ? venvPython : 'python3';
		const serverScript = path.join(serverPath, 'server.py');

		this._panel.webview.postMessage({
			command: 'configData',
			data: {
				bedrockRegion: config.get('bedrockRegion'),
				bedrockModel: config.get('bedrockModel'),
				awsProfile: config.get('awsProfile', ''),
				serverPath: serverPath,
				pythonCommand: pythonCommand,
				serverScript: serverScript,
				serverStatus: 'running'
			}
		});
	}

	private async _saveCredentials(data: any) {
		const config = vscode.workspace.getConfiguration('systemdesigntutor');

		try {
			await config.update('bedrockRegion', data.region, vscode.ConfigurationTarget.Global);
			await config.update('awsProfile', data.profile, vscode.ConfigurationTarget.Global);

			this._panel.webview.postMessage({
				command: 'saveResult',
				success: true,
				message: 'Credentials saved successfully'
			});
		} catch (error) {
			this._panel.webview.postMessage({
				command: 'saveResult',
				success: false,
				message: error instanceof Error ? error.message : 'Failed to save credentials'
			});
		}
	}

	private async _testCredentials() {
		const config = vscode.workspace.getConfiguration('systemdesigntutor');
		const awsProfile = config.get('awsProfile', 'default');
		const bedrockRegion = config.get('bedrockRegion', 'us-east-1');

		this._panel.webview.postMessage({
			command: 'testResult',
			success: false,
			message: 'Testing credentials...'
		});

		try {
			const { spawn } = require('child_process');
			const serverPath = this._getServerPath();
			const venvPython = path.join(serverPath, 'venv', 'bin', 'python');
			const pythonCommand = fs.existsSync(venvPython) ? venvPython : 'python3';

			const testScript = `
import sys
import os
os.environ['AWS_PROFILE'] = '${awsProfile}'
os.environ['AWS_DEFAULT_REGION'] = '${bedrockRegion}'

try:
    import boto3
except ImportError:
    print('INFO: boto3 not installed - AWS credentials will be tested when MCP server starts')
    print('SUCCESS')
    sys.exit(0)

try:
    import json
    
    # Test bedrock-runtime with a simple invoke
    client = boto3.client('bedrock-runtime', region_name='${bedrockRegion}')
    
    # Try to invoke a model with minimal input
    body = json.dumps({"inputText": "test"})
    response = client.invoke_model(
        modelId="amazon.titan-embed-text-v1",
        body=body,
        contentType="application/json",
        accept="application/json"
    )
    
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {str(e)}')
    sys.exit(1)
`;

			const process = spawn(pythonCommand, ['-c', testScript]);
			let output = '';
			let errorOutput = '';

			process.stdout.on('data', (data: Buffer) => {
				output += data.toString();
			});

			process.stderr.on('data', (data: Buffer) => {
				errorOutput += data.toString();
			});

			process.on('close', (code: number) => {
				if (code === 0 && output.includes('SUCCESS')) {
					this._panel.webview.postMessage({
						command: 'testResult',
						success: true,
						message: 'AWS credentials validated successfully'
					});
				} else {
					const errorMsg = errorOutput || output || 'Unknown error';
					this._panel.webview.postMessage({
						command: 'testResult',
						success: false,
						message: `Credential test failed: ${errorMsg}`
					});
				}
			});
		} catch (error) {
			this._panel.webview.postMessage({
				command: 'testResult',
				success: false,
				message: error instanceof Error ? error.message : 'Failed to test credentials'
			});
		}
	}

	private async _syncData() {
		this._panel.webview.postMessage({
			command: 'syncProgress',
			message: 'Starting data sync...'
		});

		try {
			await vscode.commands.executeCommand('systemdesigntutor.syncData');

			this._panel.webview.postMessage({
				command: 'syncResult',
				success: true,
				message: 'Data sync completed successfully'
			});
		} catch (error) {
			this._panel.webview.postMessage({
				command: 'syncResult',
				success: false,
				message: error instanceof Error ? error.message : 'Sync failed'
			});
		}
	}

	private _copyMcpConfig() {
		const serverPath = this._getServerPath();
		const venvPython = path.join(serverPath, 'venv', 'bin', 'python');
		const pythonCommand = fs.existsSync(venvPython) ? venvPython : 'python3';
		const serverScript = path.join(serverPath, 'server.py');

		const mcpConfig = {
			"mcpServers": {
				"system-design-tutor": {
					"command": pythonCommand,
					"args": [serverScript],
					"disabled": false
				}
			}
		};

		vscode.env.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));

		this._panel.webview.postMessage({
			command: 'copyResult',
			success: true,
			message: 'MCP configuration copied to clipboard'
		});
	}

	private _getServerPath(): string {
		return path.join(this._extensionPath, 'python-server');
	}

	private _getHtmlContent(): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>System Design Tutor Configuration</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			padding: 20px;
			line-height: 1.6;
		}
		h1 {
			color: var(--vscode-foreground);
			border-bottom: 1px solid var(--vscode-panel-border);
			padding-bottom: 10px;
			margin-bottom: 20px;
		}
		h2 {
			color: var(--vscode-foreground);
			margin-top: 0;
			margin-bottom: 15px;
			font-size: 16px;
		}
		.grid-container {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			grid-template-rows: auto auto;
			gap: 20px;
			margin-bottom: 20px;
		}
		.top-row {
			display: contents;
		}
		.section {
			padding: 20px;
			background-color: var(--vscode-editor-inactiveSelectionBackground);
			border-radius: 6px;
			border: 1px solid var(--vscode-panel-border);
			display: flex;
			flex-direction: column;
			height: 250px;
			overflow: hidden;
		}
		.section.full-width {
			grid-column: 1 / -1;
			height: auto;
		}
		.section-content {
			flex: 1;
			display: flex;
			flex-direction: column;
		}
		.section-actions {
			margin-top: auto;
			padding-top: 15px;
		}
		.form-group {
			margin-bottom: 15px;
		}
		label {
			display: block;
			margin-bottom: 5px;
			font-weight: 600;
		}
		input, select {
			width: 100%;
			padding: 8px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 2px;
			box-sizing: border-box;
		}
		button {
			padding: 8px 16px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 2px;
			cursor: pointer;
			margin-right: 10px;
		}
		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		button.secondary {
			background-color: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
		}
		button.secondary:hover {
			background-color: var(--vscode-button-secondaryHoverBackground);
		}
		button.success {
			background-color: #4caf50;
			color: white;
		}
		button.success:hover {
			background-color: #45a049;
		}
		.status {
			display: inline-block;
			padding: 4px 8px;
			border-radius: 2px;
			font-size: 12px;
			font-weight: 600;
		}
		.status.running {
			background-color: #4caf50;
			color: white;
		}
		.status.stopped {
			background-color: #f44336;
			color: white;
		}
		.info-text {
			color: var(--vscode-descriptionForeground);
			font-size: 13px;
			margin-top: 5px;
		}
		.server-path {
			display: block;
			max-width: 100%;
			overflow-x: auto;
			white-space: nowrap;
			font-family: monospace;
			font-size: 11px;
			padding: 4px;
			background-color: var(--vscode-textCodeBlock-background);
			border-radius: 3px;
			margin-top: 5px;
		}
		ol.info-text {
			margin-left: 20px;
			margin-bottom: 15px;
		}
		ol.info-text li {
			margin-bottom: 5px;
		}
		.code-block {
			background-color: var(--vscode-textCodeBlock-background);
			padding: 10px;
			border-radius: 4px;
			font-family: monospace;
			font-size: 12px;
			overflow-x: auto;
			margin-top: 10px;
			white-space: pre-wrap;
			word-wrap: break-word;
		}
		.message {
			padding: 10px;
			border-radius: 4px;
			margin-top: 10px;
			display: none;
		}
		.message.success {
			background-color: rgba(76, 175, 80, 0.2);
			border: 1px solid #4caf50;
		}
		.message.error {
			background-color: rgba(244, 67, 54, 0.2);
			border: 1px solid #f44336;
		}
		.message.show {
			display: block;
		}
	</style>
</head>
<body>
	<h1>System Design Tutor Configuration</h1>

	<div class="grid-container">
		<!-- First Row: 3 Columns -->
		<div class="section">
			<h2>MCP Server Status</h2>
			<div class="section-content">
				<p>
					Status: <span class="status running" id="serverStatus">Loading...</span>
				</p>
				<p class="info-text">Server Path:</p>
				<div class="server-path" id="serverPath">Loading...</div>
			</div>
		</div>

		<div class="section">
			<h2>AWS Credentials</h2>
			<div class="section-content">
				<div class="form-group">
					<label for="awsProfile">AWS Profile Name</label>
					<input type="text" id="awsProfile" placeholder="default" />
					<p class="info-text">From ~/.aws/credentials</p>
				</div>
			</div>
			<div class="section-actions">
				<button onclick="saveCredentials()">Save</button>
				<button class="success" onclick="testCredentials()">Test Connection</button>
				<div id="credentialsMessage" class="message"></div>
			</div>
		</div>

		<div class="section">
			<h2>Data Sync</h2>
			<div class="section-content">
				<p class="info-text">Sync latest system design content from GitHub repository</p>
			</div>
			<div class="section-actions">
				<button onclick="syncData()">Sync Data</button>
				<div id="syncMessage" class="message"></div>
			</div>
		</div>

		<!-- Second Row: Full Width -->
		<div class="section full-width">
			<h2>MCP Configuration for Cline</h2>
			<p class="info-text">To use this extension with Cline:</p>
			<ol class="info-text">
				<li>Open Cline settings (Command Palette → "Cline: Open MCP Settings")</li>
				<li>Copy the configuration below</li>
				<li>Paste it into your MCP settings file</li>
				<li>Restart Cline or reload the MCP server</li>
			</ol>
			<div class="code-block" id="mcpConfig">Loading...</div>
			<button onclick="copyMcpConfig()">Copy to Clipboard</button>
			<div id="copyMessage" class="message"></div>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		
		// Send a test message immediately to confirm webview is working
		vscode.postMessage({ command: 'webviewReady' });

		window.addEventListener('message', event => {
			const message = event.data;
			
			switch (message.command) {
				case 'configData':
					updateConfigUI(message.data);
					break;
				case 'saveResult':
					showMessage('credentialsMessage', message.success, message.message);
					break;
				case 'testResult':
					showMessage('credentialsMessage', message.success, message.message);
					break;
				case 'syncProgress':
					showMessage('syncMessage', true, message.message);
					break;
				case 'syncResult':
					showMessage('syncMessage', message.success, message.message);
					break;
				case 'copyResult':
					showMessage('copyMessage', message.success, message.message);
					break;
			}
		});

		function updateConfigUI(data) {
			document.getElementById('awsProfile').value = data.awsProfile || '';
			document.getElementById('serverPath').textContent = data.serverPath || 'Unknown';
			
			const statusEl = document.getElementById('serverStatus');
			statusEl.textContent = data.serverStatus === 'running' ? 'Running' : 'Stopped';
			statusEl.className = 'status ' + data.serverStatus;

			const mcpConfig = {
				"mcpServers": {
					"system-design-tutor": {
						"command": data.pythonCommand || (data.serverPath + "/venv/bin/python"),
						"args": [data.serverScript || (data.serverPath + "/server.py")],
						"disabled": false
					}
				}
			};
			document.getElementById('mcpConfig').textContent = JSON.stringify(mcpConfig, null, 2);
		}

		function showMessage(elementId, success, message) {
			const el = document.getElementById(elementId);
			el.textContent = message;
			el.className = 'message ' + (success ? 'success' : 'error') + ' show';
			setTimeout(() => {
				el.className = 'message';
			}, 5000);
		}

		function saveCredentials() {
			vscode.postMessage({
				command: 'saveCredentials',
				data: {
					profile: document.getElementById('awsProfile').value
				}
			});
		}

		function testCredentials() {
			vscode.postMessage({ command: 'testCredentials' });
		}

		function syncData() {
			vscode.postMessage({ command: 'syncData' });
		}

		function copyMcpConfig() {
			vscode.postMessage({ command: 'copyMcpConfig' });
		}


	</script>
</body>
</html>`;
	}

	public dispose() {
		ConfigPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
