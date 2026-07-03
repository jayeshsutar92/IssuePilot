import httpx
from typing import List, Dict, Any, Optional
from app.config import settings

class GitHubClient:
    def __init__(self, pat: Optional[str] = None):
        raw_pat = pat or settings.GITHUB_PAT
        self.pat = None
        
        if raw_pat:
            clean_pat = raw_pat.strip()
            if not clean_pat.isascii():
                invalid_chars = [c for c in clean_pat if ord(c) >= 128]
                print(f"Error: Invalid non-ASCII characters found in GitHub PAT: {invalid_chars}")
                raise ValueError(
                    "The provided GitHub Personal Access Token contains invalid non-ASCII characters. "
                    "Please check your .env file or input for hidden characters or accidental pastes."
                )
            self.pat = clean_pat

        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        if self.pat:
            self.headers["Authorization"] = f"Bearer {self.pat}"
            
        self.client = httpx.AsyncClient(headers=self.headers, timeout=15.0)

    async def close(self):
        await self.client.aclose()

    async def get_user_repositories(self) -> List[Dict[str, Any]]:
        """Fetch all repositories accessible by the PAT."""
        repos = []
        # Fetch user's own repos
        response = await self.client.get("https://api.github.com/user/repos?per_page=100")
        if response.status_code == 200:
            repos.extend(response.json())
        else:
            # Fallback to public search or error handling
            raise Exception(f"Failed to fetch user repositories: {response.text}")
        return repos

    async def get_repository_issues(self, owner: str, repo: str, state: str = "open", per_page: int = 100) -> List[Dict[str, Any]]:
        """Fetch issues for a specific repository."""
        response = await self.client.get(
            f"https://api.github.com/repos/{owner}/{repo}/issues",
            params={"state": state, "per_page": per_page}
        )
        if response.status_code == 200:
            # Note: GitHub issues API also returns pull requests. We need to filter them out.
            issues = [item for item in response.json() if "pull_request" not in item]
            return issues
        else:
            raise Exception(f"Failed to fetch issues for {owner}/{repo}: {response.text}")

    async def search_issues(self, owner: str, repo: str, query: str, state: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search issues in a repository using GitHub Search API."""
        q = f"repo:{owner}/{repo} is:issue"
        if state:
            q += f" state:{state}"
        if query:
            # Clean query
            clean_query = query.replace('"', '').replace("'", "")
            q += f" {clean_query}"

        response = await self.client.get(
            "https://api.github.com/search/issues",
            params={"q": q, "per_page": 10}
        )
        if response.status_code == 200:
            return response.json().get("items", [])
        else:
            # Log error and return empty list to prevent agent crash
            print(f"GitHub search failed: {response.text}")
            return []

    async def get_issue(self, owner: str, repo: str, issue_number: int) -> Dict[str, Any]:
        """Fetch a specific issue."""
        response = await self.client.get(f"https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to fetch issue {owner}/{repo}#{issue_number}: {response.text}")
