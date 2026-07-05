# Installation Guide

## Prerequisites

1. **Python 3.8+** must be installed and available as `python3` command
2. **AWS Credentials** configured for Bedrock access

## Python Dependencies

Install required Python packages globally or in your preferred environment:

```bash
pip3 install mcp strands-agents boto3 chromadb requests
```

Or use the requirements file:

```bash
cd python-server
pip3 install -r requirements.txt
```

## Install Extension

1. Download `systemdesigntutor-0.0.1.vsix`
2. Open VSCode
3. Press `Cmd+Shift+X` (Extensions)
4. Click `...` menu → "Install from VSIX..."
5. Select the `.vsix` file
6. Reload VSCode

## Usage

Press `Cmd+Shift+P` and type:
- "System Design Tutor: Sync System Design Data" - Download learning materials
- "System Design Tutor: Ask Question" - Start tutoring session

## Troubleshooting

Check the "System Design Tutor MCP Server" output channel for logs.
