#!/usr/bin/env python3
"""
MCP Server for System Design Tutor (HTTP Transport)
Implements Model Context Protocol with /question and /sync tools
"""
import asyncio
from mcp.server import Server
from mcp.server.sse import sse_server
from tools import register_tools
from logger import info

server = Server("system-design-tutor")

async def main():
    """Initialize and run the MCP server with HTTP transport"""
    info("MCP server initializing (HTTP mode)...")
    
    register_tools(server)
    
    info("Tools registered, starting HTTP server on port 3000...")
    
    # Run SSE server on port 3000
    async with sse_server(server) as (read_stream, write_stream):
        info("HTTP server running on http://localhost:3000")
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    info("Starting System Design Tutor MCP Server (HTTP)")
    asyncio.run(main())
