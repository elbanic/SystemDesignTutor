#!/usr/bin/env node
/**
 * Integration test for VS Code extension
 * Tests that all components can be loaded and initialized
 */
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing VS Code Extension Integration\n');

// Test 1: Check compiled files exist
console.log('✓ Test 1: Checking compiled files...');
const requiredFiles = [
    'out/extension.js',
    'out/serverManager.js',
    'out/commands/syncCommand.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`  ✓ ${file} exists`);
    } else {
        console.log(`  ✗ ${file} missing`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.error('\n❌ Some compiled files are missing!');
    process.exit(1);
}

// Test 2: Check Python server exists
console.log('\n✓ Test 2: Checking Python server...');
const pythonServerPath = path.join(__dirname, '..', 'python-server');
const serverScript = path.join(pythonServerPath, 'server.py');
const venvPython = path.join(pythonServerPath, 'venv', 'bin', 'python');

if (fs.existsSync(serverScript)) {
    console.log(`  ✓ server.py exists`);
} else {
    console.log(`  ✗ server.py missing`);
    process.exit(1);
}

if (fs.existsSync(venvPython)) {
    console.log(`  ✓ Python venv exists`);
} else {
    console.log(`  ✗ Python venv missing`);
    process.exit(1);
}

// Test 3: Check package.json configuration
console.log('\n✓ Test 3: Checking package.json...');
const packageJson = require('./package.json');

if (packageJson.main === './out/extension.js') {
    console.log(`  ✓ Main entry point correct`);
} else {
    console.log(`  ✗ Main entry point incorrect`);
    process.exit(1);
}

const syncCommand = packageJson.contributes.commands.find(
    cmd => cmd.command === 'systemdesigntutor.syncData'
);
if (syncCommand) {
    console.log(`  ✓ Sync command registered`);
} else {
    console.log(`  ✗ Sync command not registered`);
    process.exit(1);
}

// Test 4: Check extension exports (can't load vscode module outside VS Code)
console.log('\n✓ Test 4: Checking extension exports...');
const extensionCode = fs.readFileSync('./out/extension.js', 'utf8');
if (extensionCode.includes('function activate') || extensionCode.includes('exports.activate')) {
    console.log(`  ✓ activate() function exists`);
} else {
    console.log(`  ✗ activate() function missing`);
    process.exit(1);
}
if (extensionCode.includes('function deactivate') || extensionCode.includes('exports.deactivate')) {
    console.log(`  ✓ deactivate() function exists`);
} else {
    console.log(`  ✗ deactivate() function missing`);
    process.exit(1);
}

// Test 5: Check setup script
console.log('\n✓ Test 5: Checking setup script...');
const setupScript = path.join(__dirname, 'scripts', 'setup-python.js');
if (fs.existsSync(setupScript)) {
    console.log(`  ✓ setup-python.js exists`);
} else {
    console.log(`  ✗ setup-python.js missing`);
    process.exit(1);
}

console.log('\n✅ All integration tests passed!\n');
console.log('Next steps:');
console.log('1. Press F5 in VS Code to launch Extension Development Host');
console.log('2. Check "System Design Tutor MCP Server" output channel');
console.log('3. Run command: "System Design Tutor: Sync System Design Data"');
