from typing import List, Dict, Any
from .vector_store import Document
from .embeddings import EmbeddingGenerator
from .github_sync import GitHubSync


class DataIngestionPipeline:
    """Process and ingest documents into vector database."""
    
    def __init__(self, embedding_generator: EmbeddingGenerator):
        """Initialize data ingestion pipeline.
        
        Args:
            embedding_generator: EmbeddingGenerator instance for creating embeddings
        """
        self.embedding_generator = embedding_generator
    
    def process_documents(self, raw_documents: List[Dict[str, Any]]) -> List[Document]:
        """Process raw documents into Document objects with embeddings.
        
        Args:
            raw_documents: List of dicts with 'content' and 'metadata' keys
            
        Returns:
            List of Document objects with embeddings
        """
        documents = []
        total_docs = len(raw_documents)
        
        for doc_idx, raw_doc in enumerate(raw_documents, 1):
            chunks = self._chunk_document(raw_doc['content'])
            print(f'Processing doc {doc_idx}/{total_docs}: {raw_doc["metadata"]["path"]} ({len(chunks)} chunks)', flush=True)
            
            for i, chunk in enumerate(chunks):
                embedding = self.embedding_generator.generate_embedding(chunk)
                
                metadata = raw_doc['metadata'].copy()
                metadata['chunk_index'] = i
                metadata['total_chunks'] = len(chunks)
                
                doc = Document(
                    content=chunk,
                    metadata=metadata,
                    embedding=embedding
                )
                documents.append(doc)
        
        return documents
    
    def _chunk_document(self, content: str, chunk_size: int = 1000) -> List[str]:
        """Split document into chunks for processing.
        
        Args:
            content: Document content to chunk
            chunk_size: Maximum characters per chunk
            
        Returns:
            List of text chunks
        """
        if len(content) <= chunk_size:
            return [content]
        
        chunks = []
        lines = content.split('\n')
        current_chunk = []
        current_size = 0
        
        for line in lines:
            line_size = len(line) + 1  # +1 for newline
            
            if current_size + line_size > chunk_size and current_chunk:
                chunks.append('\n'.join(current_chunk))
                current_chunk = [line]
                current_size = line_size
            else:
                current_chunk.append(line)
                current_size += line_size
        
        if current_chunk:
            chunks.append('\n'.join(current_chunk))
        
        return chunks
    
    def sync_from_github(self, github_sync: GitHubSync) -> List[Document]:
        """Fetch documents from GitHub and process them.
        
        Args:
            github_sync: GitHubSync instance for fetching content
            
        Returns:
            List of processed Document objects
        """
        raw_documents = github_sync.fetch_latest_content()
        return self.process_documents(raw_documents)
