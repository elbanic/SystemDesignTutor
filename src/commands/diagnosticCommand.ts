import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export async function executeDiagnosticCommand(extensionPath: string): Promise<void> {
    const outputChannel = vscode.window.createOutputChannel('System Design Tutor Diagnostics');
    outputChannel.show();
    
    outputChannel.appendLine('=== System Design Tutor Diagnostics ===\n');
    
    // Check Python server path
    const bundledPath = path.join(extensionPath, 'python-server');
    const siblingPath = path.join(extensionPath, '..', 'python-server');
    const pythonServerPath = fs.existsSync(siblingPath) ? siblingPath : bundledPath;
    
    outputChannel.appendLine(`Extension Path: ${extensionPath}`);
    outputChannel.appendLine(`Python Server Path: ${pythonServerPath}`);
    outputChannel.appendLine(`Python Server Exists: ${fs.existsSync(pythonServerPath)}`);
    
    // Check server.py
    const serverScript = path.join(pythonServerPath, 'server.py');
    outputChannel.appendLine(`Server Script: ${serverScript}`);
    outputChannel.appendLine(`Server Script Exists: ${fs.existsSync(serverScript)}`);
    
    // Check venv
    const venvPython = path.join(pythonServerPath, 'venv', 'bin', 'python');
    outputChannel.appendLine(`Venv Python: ${venvPython}`);
    outputChannel.appendLine(`Venv Exists: ${fs.existsSync(venvPython)}`);
    
    // Check vector DB
    const dbPath = path.join(pythonServerPath, 'data', 'vector_db');
    outputChannel.appendLine(`Vector DB Path: ${dbPath}`);
    outputChannel.appendLine(`Vector DB Exists: ${fs.existsSync(dbPath)}`);
    
    if (fs.existsSync(dbPath)) {
        const files = fs.readdirSync(dbPath);
        outputChannel.appendLine(`Vector DB Files: ${files.length} files`);
    }
    
    // Check configuration
    const config = vscode.workspace.getConfiguration('systemdesigntutor');
    outputChannel.appendLine(`\nConfiguration:`);
    outputChannel.appendLine(`  AWS Profile: ${config.get('awsProfile')}`);
    outputChannel.appendLine(`  Bedrock Region: ${config.get('bedrockRegion')}`);
    outputChannel.appendLine(`  Bedrock Model: ${config.get('bedrockModel')}`);
    
    outputChannel.appendLine('\n=== Diagnostics Complete ===');
    
    vscode.window.showInformationMessage('Diagnostics complete. Check the output panel.');
}
