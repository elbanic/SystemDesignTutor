#!/usr/bin/env python3
"""
MCP Server for System Design Tutor
Implements Model Context Protocol with /question and /sync tools
"""
import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server
from tools import register_tools
from logger import info, debug

server = Server("system-design-tutor")

async def main():
    """Initialize and run the MCP server"""
    info("MCP server initializing...")
    
    register_tools(server)
    
    info("Tools registered, starting server...")
    
    async with stdio_server() as (read_stream, write_stream):
        info("Server running and ready for requests")
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    info("Starting System Design Tutor MCP Server")
    asyncio.run(main())
