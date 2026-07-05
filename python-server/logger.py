"""
Simple logger that writes to stderr and file for visibility
"""
import sys
import os
from datetime import datetime

# Log file path
LOG_FILE = os.path.join(os.path.dirname(__file__), "mcp_server.log")


def log(message: str, level: str = "DEBUG"):
    """Log a message to stderr and file with timestamp and level.
    
    Args:
        message: Message to log
        level: Log level (DEBUG, INFO, ERROR)
    """
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    log_line = f"[{timestamp}] [{level}] {message}\n"
    
    # Write to stderr
    sys.stderr.write(log_line)
    sys.stderr.flush()
    
    # Also write to file
    try:
        with open(LOG_FILE, "a") as f:
            f.write(log_line)
    except Exception:
        pass  # Ignore file write errors


def debug(message: str):
    """Log a debug message."""
    log(message, "DEBUG")


def info(message: str):
    """Log an info message."""
    log(message, "INFO")


def error(message: str):
    """Log an error message."""
    log(message, "ERROR")
