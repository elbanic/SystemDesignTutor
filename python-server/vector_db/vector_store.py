import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any
import os


class Document:
    """Represents a document with content, metadata, and embedding."""
    def __init__(self, content: str, metadata: Dict[str, Any], embedding: List[float] = None):
        self.content = content
        self.metadata = metadata
        self.embedding = embedding


class VectorStore:
    """ChromaDB-based vector store for semantic search."""
    
    def __init__(self, db_path: str):
        """Initialize ChromaDB client with persistent storage.
        
        Args:
            db_path: Path to store ChromaDB data
        """
        os.makedirs(db_path, exist_ok=True)
        
        self.client = chromadb.PersistentClient(
            path=db_path,
            settings=Settings(anonymized_telemetry=False)
        )
        
        self.collection = self.client.get_or_create_collection(
            name="system_design_docs",
            metadata={"description": "System design primer documents"}
        )
    
    def add_documents(self, documents: List[Document]) -> None:
        """Ingest system design documents into vector DB.
        
        Args:
            documents: List of Document objects with content, metadata, and embeddings
        """
        if not documents:
            return
        
        ids = [f"doc_{i}" for i in range(len(documents))]
        contents = [doc.content for doc in documents]
        metadatas = [doc.metadata for doc in documents]
        embeddings = [doc.embedding for doc in documents]
        
        self.collection.add(
            ids=ids,
            documents=contents,
            metadatas=metadatas,
            embeddings=embeddings
        )
    
    def search(self, query_embedding: List[float], top_k: int = 5) -> List[Document]:
        """Perform semantic search and return top-k relevant documents.
        
        Args:
            query_embedding: Embedding vector for the query
            top_k: Number of results to return
            
        Returns:
            List of Document objects matching the query
        """
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        documents = []
        if results['documents'] and results['documents'][0]:
            for i in range(len(results['documents'][0])):
                doc = Document(
                    content=results['documents'][0][i],
                    metadata=results['metadatas'][0][i] if results['metadatas'] else {},
                    embedding=results['embeddings'][0][i] if results['embeddings'] else None
                )
                documents.append(doc)
        
        return documents
    
    def clear_and_reload(self, documents: List[Document]) -> None:
        """Clear existing data and reload with new documents.
        
        Args:
            documents: List of Document objects to store
        """
        self.client.delete_collection(name="system_design_docs")
        self.collection = self.client.create_collection(
            name="system_design_docs",
            metadata={"description": "System design primer documents"}
        )
        self.add_documents(documents)
    
    def count(self) -> int:
        """Return the number of documents in the collection."""
        return self.collection.count()
