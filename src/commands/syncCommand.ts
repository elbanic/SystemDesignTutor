import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';

const outputChannel = vscode.window.createOutputChannel('System Design Tutor - Sync');

export async function executeSyncCommand(extensionPath: string): Promise<void> {
    outputChannel.clear();
    outputChannel.show();
    outputChannel.appendLine('=== Starting Data Sync ===');
    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Syncing System Design Data',
            cancellable: false
        },
        async (progress) => {
            progress.report({ message: 'Fetching latest data from GitHub...' });

            const fs = require('fs');
            const bundledPath = path.join(extensionPath, 'python-server');
            const siblingPath = path.join(extensionPath, '..', 'python-server');
            
            const pythonServerPath = fs.existsSync(siblingPath) ? siblingPath : bundledPath;
            const venvPython = path.join(pythonServerPath, 'venv', 'bin', 'python');
            const pythonCommand = fs.existsSync(venvPython) 
                ? venvPython 
                : (process.platform === 'win32' ? 'python' : 'python3');
            
            outputChannel.appendLine(`Extension Path: ${extensionPath}`);
            outputChannel.appendLine(`Python Server Path: ${pythonServerPath}`);
            outputChannel.appendLine(`Python Command: ${pythonCommand}`);
            
            const syncScript = `
import sys
import os
sys.path.append('${pythonServerPath}')

from vector_db.vector_store import VectorStore
from vector_db.embeddings import EmbeddingGenerator
from vector_db.data_ingestion import DataIngestionPipeline
from vector_db.github_sync import GitHubSync

DB_PATH = os.path.join('${pythonServerPath}', 'data', 'vector_db')

print('Initializing components...', flush=True)
vector_store = VectorStore(DB_PATH)
embedding_generator = EmbeddingGenerator()
github_sync = GitHubSync()
data_pipeline = DataIngestionPipeline(embedding_generator)

print('Fetching documents from GitHub...', flush=True)
raw_docs = github_sync.fetch_latest_content()
print(f'Fetched {len(raw_docs)} raw documents', flush=True)

print('Processing documents and generating embeddings...', flush=True)
documents = data_pipeline.process_documents(raw_docs)
print(f'Generated {len(documents)} document chunks with embeddings', flush=True)

print('Storing in vector database...', flush=True)
vector_store.clear_and_reload(documents)

print(f'✅ Sync completed: {len(documents)} documents stored', flush=True)
`;

            return new Promise<void>((resolve, reject) => {
                const syncProcess = spawn(pythonCommand, ['-c', syncScript], {
                    cwd: pythonServerPath,
                    env: {
                        ...process.env,
                        AWS_PROFILE: vscode.workspace.getConfiguration('systemdesigntutor').get('awsProfile', 'default'),
                        AWS_DEFAULT_REGION: vscode.workspace.getConfiguration('systemdesigntutor').get('bedrockRegion', 'us-east-1')
                    }
                });

                let stdout = '';
                let stderr = '';

                syncProcess.stdout?.on('data', (data) => {
                    stdout += data.toString();
                    const lines = data.toString().split('\n');
                    lines.forEach((line: string) => {
                        if (line.trim()) {
                            outputChannel.appendLine(`[STDOUT] ${line.trim()}`);
                            progress.report({ message: line.trim() });
                        }
                    });
                });

                syncProcess.stderr?.on('data', (data) => {
                    stderr += data.toString();
                    outputChannel.appendLine(`[STDERR] ${data.toString()}`);
                });

                syncProcess.on('error', (error) => {
                    outputChannel.appendLine(`[ERROR] Process error: ${error.message}`);
                    reject(new Error(`Failed to run sync: ${error.message}`));
                });

                syncProcess.on('exit', (code) => {
                    outputChannel.appendLine(`[EXIT] Process exited with code: ${code}`);
                    outputChannel.appendLine(`=== Full STDOUT ===`);
                    outputChannel.appendLine(stdout || '(empty)');
                    outputChannel.appendLine(`=== Full STDERR ===`);
                    outputChannel.appendLine(stderr || '(empty)');
                    
                    if (code === 0) {
                        outputChannel.appendLine('✅ Sync completed successfully');
                        vscode.window.showInformationMessage('System Design data synced successfully!');
                        resolve();
                    } else {
                        outputChannel.appendLine(`❌ Sync failed with code ${code}`);
                        reject(new Error(`Sync failed with code ${code}: ${stderr || stdout}`));
                    }
                });
            });
        }
    );
}
