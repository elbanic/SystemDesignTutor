import requests
from typing import List, Dict, Any
import base64


class GitHubSync:
    """Fetch content from system-design-primer GitHub repository."""
    
    def __init__(self, repo_url: str = "https://api.github.com/repos/donnemartin/system-design-primer"):
        """Initialize GitHub API client.
        
        Args:
            repo_url: GitHub API URL for the repository
        """
        self.repo_url = repo_url
        self.api_base = repo_url
    
    def fetch_latest_content(self) -> List[Dict[str, Any]]:
        """Fetch latest markdown content from GitHub repository.
        
        Returns:
            List of documents with content and metadata
        """
        documents = []
        
        # Fetch repository tree
        tree_url = f"{self.api_base}/git/trees/master?recursive=1"
        response = requests.get(tree_url)
        response.raise_for_status()
        
        tree_data = response.json()
        
        # Filter markdown files - only English content, skip meta files
        skip_patterns = [
            'README-',  # Non-English READMEs
            'CONTRIBUTING',
            'PULL_REQUEST',
            'CODE_OF_CONDUCT',
            '.github/',
            'LICENSE'
        ]
        
        md_files = [
            item for item in tree_data.get('tree', [])
            if item['type'] == 'blob' 
            and item['path'].endswith('.md')
            and not any(pattern in item['path'] for pattern in skip_patterns)
        ]
        
        # Fetch content for each markdown file
        for file_info in md_files:
            try:
                content = self._fetch_file_content(file_info['path'])
                if content:
                    documents.append({
                        'content': content,
                        'metadata': {
                            'path': file_info['path'],
                            'source': 'system-design-primer'
                        }
                    })
            except Exception as e:
                print(f"Error fetching {file_info['path']}: {e}")
                continue
        
        return documents
    
    def _fetch_file_content(self, file_path: str) -> str:
        """Fetch content of a specific file.
        
        Args:
            file_path: Path to file in repository
            
        Returns:
            File content as string
        """
        content_url = f"{self.api_base}/contents/{file_path}"
        response = requests.get(content_url)
        response.raise_for_status()
        
        file_data = response.json()
        
        # Decode base64 content
        content_base64 = file_data.get('content', '')
        content = base64.b64decode(content_base64).decode('utf-8')
        
        return content
