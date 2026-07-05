import boto3
from typing import List
import json
import os


class EmbeddingGenerator:
    """Generate embeddings using local LlamaIndex model or AWS Bedrock Titan."""
    
    def __init__(self, region: str = "us-east-1", use_local: bool = True):
        """Initialize embedding generator.
        
        Args:
            region: AWS region for Bedrock service
            use_local: Use local LlamaIndex embedding model (faster) vs Bedrock (slower)
        """
        self.use_local = use_local
        
        if use_local:
            try:
                from llama_index.embeddings.huggingface import HuggingFaceEmbedding
                print('Loading local LlamaIndex embedding model...', flush=True)
                self.local_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
                print('Local embedding model loaded', flush=True)
            except ImportError:
                print('llama-index-embeddings-huggingface not installed, falling back to Bedrock', flush=True)
                self.use_local = False
        
        if not self.use_local:
            self.client = boto3.client("bedrock-runtime", region_name=region)
            self.model_id = "amazon.titan-embed-text-v1"
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector as list of floats
        """
        if self.use_local:
            embedding = self.local_model.get_text_embedding(text)
            return embedding
        else:
            body = json.dumps({"inputText": text})
            
            response = self.client.invoke_model(
                modelId=self.model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            
            response_body = json.loads(response['body'].read())
            return response_body['embedding']
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        embeddings = []
        for text in texts:
            embedding = self.generate_embedding(text)
            embeddings.append(embedding)
        return embeddings
