"""
Agent Client Interface
Wraps Strands Agent for MCP tool handlers
"""
import asyncio
from typing import Dict, Any
from agent.tutor_agent import TutorAgent
from vector_db.vector_store import VectorStore
from vector_db.embeddings import EmbeddingGenerator


class AgentClient:
    """Client interface for Strands Agent with timeout and error handling."""
    
    def __init__(
        self, 
        vector_store: VectorStore,
        embedding_generator: EmbeddingGenerator,
        bedrock_region: str = "us-east-1",
        model_id: str = "us.anthropic.claude-sonnet-4-20250514-v1:0",
        timeout: int = 120
    ):
        """Initialize agent client.
        
        Args:
            vector_store: VectorStore instance for semantic search
            embedding_generator: EmbeddingGenerator for query embeddings
            bedrock_region: AWS region for Bedrock service
            model_id: Bedrock model identifier
            timeout: Request timeout in seconds
        """
        self.tutor_agent = TutorAgent(
            vector_store=vector_store,
            embedding_generator=embedding_generator,
            bedrock_region=bedrock_region,
            model_id=model_id
        )
        self.timeout = timeout
    
    async def query_tutor(self, question: str) -> Dict[str, Any]:
        """Send query to Strands Agent and return structured response.
        
        Args:
            question: System design question
            
        Returns:
            Structured response dict with success status and content
            
        Raises:
            TimeoutError: If request exceeds timeout
            ValueError: If question is invalid
            Exception: For other agent errors
        """
        if not question or not question.strip():
            raise ValueError("Question must be a non-empty string")
        
        try:
            # Run agent with timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(self.tutor_agent.generate_guidance, question),
                timeout=self.timeout
            )
            
            return {
                "success": True,
                "content": response
            }
            
        except asyncio.TimeoutError:
            raise TimeoutError(f"Request timed out after {self.timeout} seconds")
        except Exception as e:
            raise Exception(f"Agent error: {str(e)}")
