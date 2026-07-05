# Testing Guide for System Design Tutor Extension

## Automated Integration Test

Run the integration test to verify all components are in place:

```bash
cd systemdesigntutor
node test-integration.js
```

Expected output: All tests should pass ✅

## Manual Testing in VS Code

### 1. Launch Extension Development Host

1. Open the `systemdesigntutor` folder in VS Code
2. Press `F5` (or Run > Start Debugging)
3. A new VS Code window will open with the extension loaded

### 2. Verify MCP Server Started

1. In the Extension Development Host window, open the Output panel (View > Output)
2. Select "System Design Tutor MCP Server" from the dropdown
3. You should see:
   ```
   Starting MCP server from: /path/to/python-server/server.py
   Using Python: /path/to/python-server/venv/bin/python
   MCP server started successfully
   ```

### 3. Test Sync Command

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type "System Design Tutor: Sync"
3. Select "System Design Tutor: Sync System Design Data"
4. You should see:
   - Progress notification: "Syncing System Design Data"
   - Real-time status updates as data is fetched
   - Success message: "System Design data synced successfully!"

### 4. Verify Extension Deactivation

1. Close the Extension Development Host window
2. Check the original VS Code window's Debug Console
3. You should see: "System Design Tutor extension deactivated"

## Troubleshooting Tests

### MCP Server Fails to Start

**Symptoms:**
- Error notification on extension activation
- Output shows "Failed to start server"

**Solutions:**
1. Check Python is installed: `python3 --version`
2. Verify venv exists: `ls python-server/venv/bin/python`
3. Run setup manually: `npm run setup-python`
4. Check Output panel for detailed error messages

### Sync Command Fails

**Symptoms:**
- Error notification: "Sync failed"
- No progress updates

**Solutions:**
1. Check internet connection
2. Verify GitHub is accessible
3. Check Output panel for Python errors
4. Ensure `python-server/vector_db/github_sync.py` exists

### Extension Won't Load

**Symptoms:**
- Extension Development Host opens but extension doesn't activate
- No output in "System Design Tutor MCP Server" channel

**Solutions:**
1. Recompile TypeScript: `npm run compile`
2. Check for compilation errors
3. Verify `out/extension.js` exists
4. Check VS Code's Developer Tools (Help > Toggle Developer Tools) for errors

## Test Checklist

- [ ] Integration test passes (`node test-integration.js`)
- [ ] Extension activates without errors
- [ ] MCP server starts successfully
- [ ] Output channel shows server logs
- [ ] Sync command appears in Command Palette
- [ ] Sync command executes with progress notification
- [ ] Sync completes successfully
- [ ] Extension deactivates cleanly

## Performance Expectations

- **Extension activation**: < 2 seconds
- **MCP server startup**: < 1 second
- **Sync operation**: 10-30 seconds (depends on network speed)

## Next Steps After Testing

Once all tests pass:
1. Test with real Bedrock credentials (for /question tool)
2. Verify vector database is populated after sync
3. Test querying the tutor agent
4. Package extension for distribution: `vsce package`
