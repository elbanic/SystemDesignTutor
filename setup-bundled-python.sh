#!/bin/bash

# Setup script for bundled python-server

cd "$(dirname "$0")/python-server"

echo "Setting up Python virtual environment in bundled python-server..."

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✓ Created virtual environment"
fi

# Activate venv and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "✓ Python dependencies installed"
echo ""
echo "Bundled python-server is ready!"
echo "Python path: $(pwd)/venv/bin/python"
