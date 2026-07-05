#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from agent_client import AgentClient
from vector_db.vector_store import VectorStore
from vector_db.embeddings import EmbeddingGenerator

async def test():
    print("Initializing...")
    db_path = os.path.join(os.path.dirname(__file__), "data", "vector_db")
    vector_store = VectorStore(db_path)
    embedding_gen = EmbeddingGenerator()
    agent = AgentClient(vector_store, embedding_gen, timeout=120)
    
    print("Testing query...")
    result = await agent.query_tutor("Design Real-time Chat System")
    
    print(f"\nSuccess: {result.get('success')}")
    if result.get('success'):
        content = result.get('content', {})
        if isinstance(content, dict) and 'content' in content:
            content = content['content']
        print(f"Modules: {len(content.get('core_modules', []))}")
        for i, mod in enumerate(content.get('core_modules', [])[:3], 1):
            print(f"  {i}. {mod.get('name')}: {mod.get('description')[:50]}...")
    
    return result

if __name__ == "__main__":
    result = asyncio.run(test())
    sys.exit(0 if result.get('success') else 1)
