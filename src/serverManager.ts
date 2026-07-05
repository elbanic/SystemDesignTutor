import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

export class ServerManager {
    private process: ChildProcess | null = null;
    private extensionPath: string;
    private outputChannel: vscode.OutputChannel;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
        this.outputChannel = vscode.window.createOutputChannel('System Design Tutor MCP Server');
    }

    async start(): Promise<void> {
        if (this.isRunning()) {
            this.outputChannel.appendLine('MCP server already running');
            return;
        }

        // Use bundled python-server
        const pythonServerPath = path.join(this.extensionPath, 'python-server');
        
        this.outputChannel.appendLine(`Using python-server from: ${pythonServerPath}`);
        
        // Check if dependencies are installed, if not, install them
        await this.ensureDependencies(pythonServerPath);
        
        const serverScript = path.join(pythonServerPath, 'server.py');
        
        // Try to use venv if it exists, otherwise fall back to system python
        const venvPython = path.join(pythonServerPath, 'venv', 'bin', 'python');
        this.outputChannel.appendLine(`Checking for venv at: ${venvPython}`);
        this.outputChannel.appendLine(`Venv exists: ${require('fs').existsSync(venvPython)}`);
        
        const pythonCommand = require('fs').existsSync(venvPython) 
            ? venvPython 
            : (process.platform === 'win32' ? 'python' : 'python3');

        this.outputChannel.appendLine(`Starting MCP server from: ${serverScript}`);
        this.outputChannel.appendLine(`Using Python: ${pythonCommand}`);

        // Get AWS configuration from VSCode settings
        const config = vscode.workspace.getConfiguration('systemdesigntutor');
        const awsProfile = config.get('awsProfile', 'default');
        const bedrockRegion = config.get('bedrockRegion', 'us-east-1');

        // Set up environment variables for AWS credentials
        const env = {
            ...process.env,
            AWS_PROFILE: awsProfile,
            AWS_DEFAULT_REGION: bedrockRegion
        };

        this.outputChannel.appendLine(`AWS Profile: ${awsProfile}`);
        this.outputChannel.appendLine(`AWS Region: ${bedrockRegion}`);

        try {
            this.process = spawn(pythonCommand, [serverScript], {
                cwd: pythonServerPath,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: env
            });

            this.process.stdout?.on('data', (data) => {
                this.outputChannel.appendLine(`[STDOUT] ${data.toString()}`);
            });

            this.process.stderr?.on('data', (data) => {
                this.outputChannel.appendLine(`[STDERR] ${data.toString()}`);
            });

            this.process.on('error', (error) => {
                this.outputChannel.appendLine(`[ERROR] Failed to start server: ${error.message}`);
                throw new Error(`Failed to start MCP server: ${error.message}`);
            });

            this.process.on('exit', (code, signal) => {
                this.outputChannel.appendLine(`[EXIT] Server exited with code ${code}, signal ${signal}`);
                this.process = null;
            });

            this.outputChannel.appendLine('MCP server started successfully');
            this.outputChannel.show();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.outputChannel.appendLine(`Failed to start server: ${errorMessage}`);
            throw new Error(`Failed to start MCP server: ${errorMessage}`);
        }
    }

    async stop(): Promise<void> {
        if (!this.process) {
            this.outputChannel.appendLine('No MCP server process to stop');
            return;
        }

        this.outputChannel.appendLine('Stopping MCP server...');
        
        this.process.kill('SIGTERM');
        
        await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                if (this.process) {
                    this.outputChannel.appendLine('Force killing MCP server');
                    this.process.kill('SIGKILL');
                }
                resolve();
            }, 5000);

            this.process?.on('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        this.process = null;
        this.outputChannel.appendLine('MCP server stopped');
    }

    isRunning(): boolean {
        return this.process !== null && !this.process.killed;
    }

    dispose(): void {
        if (this.process) {
            this.process.kill('SIGKILL');
            this.process = null;
        }
        this.outputChannel.dispose();
    }

    private async ensureDependencies(pythonServerPath: string): Promise<void> {
        const fs = require('fs');
        const requirementsFile = path.join(pythonServerPath, 'requirements.txt');
        const venvPath = path.join(pythonServerPath, 'venv');
        const venvPython = path.join(venvPath, 'bin', 'python');

        // If venv exists, we're done
        if (fs.existsSync(venvPython)) {
            this.outputChannel.appendLine('Using existing venv');
            return;
        }

        if (!fs.existsSync(requirementsFile)) {
            throw new Error('requirements.txt not found');
        }

        this.outputChannel.appendLine('Creating isolated Python virtual environment...');
        this.outputChannel.show();

        // Create venv
        await this.runCommand('python3', ['-m', 'venv', venvPath], pythonServerPath, 'Creating venv');

        // Install dependencies in venv
        await this.runCommand(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'], pythonServerPath, 'Upgrading pip');
        await this.runCommand(venvPython, ['-m', 'pip', 'install', '-r', requirementsFile], pythonServerPath, 'Installing dependencies');

        this.outputChannel.appendLine('✅ Virtual environment created and dependencies installed');
    }

    private async runCommand(command: string, args: string[], cwd: string, description: string): Promise<void> {
        this.outputChannel.appendLine(`${description}...`);
        
        return new Promise<void>((resolve, reject) => {
            const proc = spawn(command, args, { cwd });

            proc.stdout?.on('data', (data) => {
                this.outputChannel.appendLine(`[OUT] ${data.toString().trim()}`);
            });

            proc.stderr?.on('data', (data) => {
                this.outputChannel.appendLine(`[ERR] ${data.toString().trim()}`);
            });

            proc.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`${description} failed with code ${code}`));
                }
            });

            proc.on('error', (error) => {
                reject(new Error(`${description} error: ${error.message}`));
            });
        });
    }
}
