#!/usr/bin/env python3
"""
CLI tool to inspect ChromaDB vector database
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from vector_db.vector_store import VectorStore

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "vector_db")

def main():
    """Inspect vector database contents"""
    print(f"Inspecting ChromaDB at: {DB_PATH}")
    print("-" * 60)
    
    if not os.path.exists(DB_PATH):
        print("❌ Vector DB directory does not exist")
        print(f"   Expected location: {DB_PATH}")
        return
    
    try:
        vector_store = VectorStore(DB_PATH)
        count = vector_store.count()
        
        print(f"✅ Vector DB initialized successfully")
        print(f"📊 Total documents: {count}")
        
        if count > 0:
            print("\n" + "=" * 60)
            print("Sample Documents (first 3):")
            print("=" * 60)
            
            # Get collection to inspect documents
            collection = vector_store.collection
            results = collection.get(limit=3)
            
            if results['documents']:
                for i, (doc_id, content, metadata) in enumerate(zip(
                    results['ids'],
                    results['documents'],
                    results['metadatas']
                ), 1):
                    print(f"\n[Document {i}]")
                    print(f"ID: {doc_id}")
                    print(f"Metadata: {metadata}")
                    print(f"Content preview: {content[:200]}...")
                    print("-" * 60)
        else:
            print("\n⚠️  No documents found in vector DB")
            print("   Run sync to populate the database")
    
    except Exception as e:
        print(f"❌ Error inspecting database: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
