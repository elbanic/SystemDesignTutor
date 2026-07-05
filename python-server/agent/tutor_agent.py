"""
Strands Agent for System Design Tutoring
Uses Bedrock LLM to generate structured system design guidance
"""
import boto3
from strands import Agent
from typing import Dict, Any, Optional
import sys
import os
from datetime import datetime
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from vector_db.vector_store import VectorStore
from vector_db.embeddings import EmbeddingGenerator
from .response_formatter import ResponseFormatter
from .prompt_templates import PromptTemplates


def _log(msg: str, level: str = "DEBUG"):
    """Log to stderr for immediate visibility."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    sys.stderr.write(f"[{timestamp}] [{level}] {msg}\n")
    sys.stderr.flush()


class TutorAgent:
    """System Design Tutor Agent powered by Bedrock LLM."""
    
    def __init__(
        self, 
        vector_store: VectorStore,
        embedding_generator: EmbeddingGenerator,
        bedrock_region: str = "us-east-1", 
        model_id: str = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
    ):
        """Initialize Strands Agent with Bedrock LLM and vector retrieval.
        
        Args:
            vector_store: VectorStore instance for semantic search
            embedding_generator: EmbeddingGenerator for query embeddings
            bedrock_region: AWS region for Bedrock service
            model_id: Bedrock model identifier
        """
        from botocore.config import Config
        
        # Configure boto3 with longer timeouts
        config = Config(
            read_timeout=120,
            connect_timeout=10,
            retries={'max_attempts': 0}
        )
        
        self.bedrock_client = boto3.client(
            "bedrock-runtime", 
            region_name=bedrock_region,
            config=config
        )
        self.model_id = model_id
        self.vector_store = vector_store
        self.embedding_generator = embedding_generator
        
        # Store LLM client directly (Strands Agent API may have changed)
        self.llm_client = self._create_llm_client()
    
    def _create_llm_client(self):
        """Create LLM client wrapper for Strands Agent."""
        def invoke_llm(prompt: str) -> str:
            """Invoke Bedrock LLM with the given prompt."""
            import json
            
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 8192,
                "temperature": 0.7,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })
            
            _log(f"Invoking Bedrock model: {self.model_id}")
            
            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            
            _log("Bedrock response received")
            
            response_body = json.loads(response['body'].read())
            return response_body['content'][0]['text']
        
        return invoke_llm
    

    
    def generate_guidance(self, query: str) -> Dict[str, Any]:
        """Generate comprehensive system design guidance with vector retrieval.
        
        Args:
            query: System design question
            
        Returns:
            Structured and validated response with design guidance
        """
        _log(f"Starting guidance generation for query: {query}", "INFO")
        
        # Perform semantic search before LLM invocation
        _log("Retrieving context from vector DB...")
        context = self._retrieve_context(query)
        
        # Build prompt with retrieved context
        _log("Building prompt...")
        prompt = self._build_prompt(query, context)
        
        # Invoke LLM directly
        _log("Invoking LLM...", "INFO")
        response_text = self.llm_client(prompt)
        
        _log(f"LLM response length: {len(response_text)} characters", "INFO")
        _log(f"LLM response preview (first 500 chars):\n{response_text[:500]}")
        
        # Parse and format response
        _log("Parsing response...")
        parsed_response = ResponseFormatter.parse_response(response_text)
        
        _log("Formatting response...")
        formatted_response = ResponseFormatter.format_response(parsed_response)
        
        _log("Guidance generation complete", "INFO")
        return formatted_response
    
    def _retrieve_context(self, query: str, top_k: int = 5) -> str:
        """Retrieve relevant context from vector database.
        
        Args:
            query: User's system design question
            top_k: Number of documents to retrieve
            
        Returns:
            Formatted context string from retrieved documents
        """
        # Generate query embedding
        query_embedding = self.embedding_generator.generate_embedding(query)
        
        # Perform semantic search
        documents = self.vector_store.search(query_embedding, top_k=top_k)
        
        # Log retrieval results for debugging
        _log(f"Retrieved {len(documents)} documents from vector DB for query: {query}")
        
        # Format retrieved documents into context string
        if not documents:
            _log("No documents found in vector DB")
            return ""
        
        context_parts = []
        for i, doc in enumerate(documents, 1):
            _log(f"Document {i} metadata: {doc.metadata}")
            context_parts.append(f"[Document {i}]")
            context_parts.append(doc.content)
            context_parts.append("")  # Empty line between documents
        
        return "\n".join(context_parts)
    
    def _build_prompt(self, query: str, context: str) -> str:
        """Build complete prompt with query and context using templates.
        
        Args:
            query: User's system design question
            context: Retrieved context from vector database
            
        Returns:
            Complete prompt string with all sections
        """
        return PromptTemplates.get_question_prompt(query, context)
