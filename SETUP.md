# System Design Tutor - Setup Guide

## Prerequisites

1. **Python 3.8+**: Required for the MCP server
   - Download from: https://www.python.org/downloads/
   - Verify installation: `python3 --version`

2. **AWS Credentials**: Required for Bedrock LLM access
   - Configure AWS credentials with Bedrock access
   - Set up via AWS CLI or environment variables

## Installation

### Automatic Setup (Recommended)

The extension will automatically set up the Python environment on first activation:

1. Install the extension in VS Code
2. The extension will create a Python virtual environment
3. Dependencies will be installed automatically

### Manual Setup

If automatic setup fails, run manually:

```bash
cd python-server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Configuration

Configure the extension in VS Code settings:

- `systemdesigntutor.bedrockRegion`: AWS Bedrock region (default: us-east-1)
- `systemdesigntutor.bedrockModel`: Bedrock model ID (default: Claude 3 Sonnet)
- `systemdesigntutor.mcpServerPort`: MCP server port (default: 0 for auto-assign)

## Initial Data Sync

After installation, sync the system design knowledge base:

1. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Run: "System Design Tutor: Sync System Design Data"
3. Wait for sync to complete

## Usage

Ask Cline (Kiro) system design questions:
- "Teach me the design Real-time Chat System"
- "Design URL Shortener"
- "How to design Instagram"

## Troubleshooting

### Python Not Found
- Ensure Python 3.8+ is installed and in PATH
- Try: `python3 --version`

### MCP Server Failed to Start
- Check Output panel: "System Design Tutor MCP Server"
- Verify Python dependencies are installed
- Run manual setup steps

### AWS Credentials Error
- Configure AWS credentials: `aws configure`
- Ensure Bedrock access is enabled in your AWS account
- Check region configuration matches your Bedrock setup

### Sync Failed
- Check internet connection
- Verify GitHub access (no authentication required)
- Check Output panel for detailed error messages
