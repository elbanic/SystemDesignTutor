const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', '..', 'python-server');
const targetDir = path.join(__dirname, '..', 'python-server');

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        console.log(`Source directory not found: ${src}`);
        return;
    }

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        // Skip venv and __pycache__
        if (entry.name === 'venv' || entry.name === '__pycache__' || entry.name === '.pytest_cache') {
            continue;
        }

        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Copying python-server to extension...');
copyRecursive(sourceDir, targetDir);
console.log('Python server copied successfully');
