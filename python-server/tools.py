"""
MCP Tools implementation for System Design Tutor
Defines /question and /sync tools
"""
import json
import asyncio
from mcp.server import Server
from mcp.types import Tool, TextContent
from agent_client import AgentClient
from vector_db.vector_store import VectorStore
from vector_db.embeddings import EmbeddingGenerator
from vector_db.data_ingestion import DataIngestionPipeline
from vector_db.github_sync import GitHubSync
import os

# Initialize components
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "vector_db")
vector_store = VectorStore(DB_PATH)
embedding_generator = EmbeddingGenerator()
agent_client = AgentClient(vector_store, embedding_generator)

def register_tools(server: Server):
    """Register all MCP tools with the server"""
    
    @server.list_tools()
    async def list_tools() -> list[Tool]:
        """List available tools"""
        return [
            Tool(
                name="question",
                description="Ask a system design question and receive structured tutoring guidance",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "System design question (e.g., 'Design Real-time Chat System')"
                        }
                    },
                    "required": ["query"]
                }
            ),
            Tool(
                name="sync",
                description="Sync latest system design data from GitHub repository to vector database",
                inputSchema={
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            )
        ]
    
    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        """Handle tool invocations"""
        if name == "question":
            return await handle_question(arguments)
        elif name == "sync":
            return await handle_sync(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")

async def handle_question(arguments: dict) -> list[TextContent]:
    """
    Handle /question tool requests
    Validates input and returns structured system design guidance
    """
    from logger import debug, info, error
    
    debug(f"handle_question called with arguments: {arguments}")
    
    query = arguments.get("query", "").strip()
    
    info(f"Processing query: {query}")
    
    if not query:
        return [TextContent(
            type="text",
            text=json.dumps({
                "success": False,
                "error": {
                    "code": "INVALID_QUERY",
                    "message": "Query parameter is required and must be a non-empty string"
                }
            })
        )]
    
    try:
        info("Calling agent client...")
        
        # Call agent client to get tutoring response
        response = await agent_client.query_tutor(query)
        
        info("Agent client returned response")
        return [TextContent(
            type="text",
            text=json.dumps(response)
        )]
        
    except TimeoutError as e:
        error(f"Timeout error: {e}")
        return [TextContent(
            type="text",
            text=json.dumps({
                "success": False,
                "error": {
                    "code": "TIMEOUT",
                    "message": str(e)
                }
            })
        )]
    except Exception as e:
        error(f"Exception in handle_question: {e}")
        import traceback
        error(f"Traceback: {traceback.format_exc()}")
        return [TextContent(
            type="text",
            text=json.dumps({
                "success": False,
                "error": {
                    "code": "AGENT_ERROR",
                    "message": str(e)
                }
            })
        )]

async def handle_sync(arguments: dict) -> list[TextContent]:
    """
    Handle /sync tool requests
    Triggers GitHub sync and vector database update
    """
    try:
        # Initialize GitHub sync and data ingestion
        github_sync = GitHubSync()
        data_pipeline = DataIngestionPipeline(embedding_generator)
        
        # Fetch and process documents from GitHub
        documents = await asyncio.to_thread(
            data_pipeline.sync_from_github,
            github_sync
        )
        
        # Reload vector database with new documents
        await asyncio.to_thread(
            vector_store.clear_and_reload,
            documents
        )
        
        response = {
            "success": True,
            "message": "Sync completed successfully",
            "status": "completed",
            "documents_processed": len(documents)
        }
        
        return [TextContent(
            type="text",
            text=json.dumps(response)
        )]
        
    except Exception as e:
        return [TextContent(
            type="text",
            text=json.dumps({
                "success": False,
                "error": {
                    "code": "SYNC_ERROR",
                    "message": str(e)
                }
            })
        )]
