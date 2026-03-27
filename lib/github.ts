const GITHUB_API = 'https://api.github.com';

export type RepoParts = { owner: string; repo: string; branch: string };
export type RepoFile = { path: string; content: string };

export function parseGitHubUrl(input: string): RepoParts {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.hostname !== 'github.com') throw new Error('Must be a github.com URL');

  const parts = url.pathname.split('/').filter(Boolean);
  const owner = parts[0];
  const repo = parts[1];
  
  // Set branch to empty string if not in URL so we can detect it later
  let branch = ''; 
  if (parts[2] === 'tree' && parts[3]) branch = parts[3];
  
  if (!owner || !repo) throw new Error('Invalid GitHub repo URL path');

  return { owner, repo, branch };
}

function ghHeaders(token?: string) {
  const headers: Record<string, string> = {
    'User-Agent': 'RepoScope',
    'Accept': 'application/vnd.github.v3+json',
  };
  
  const activeToken = token || process.env.GITHUB_TOKEN;
  
  if (activeToken) {
    // Changed 'token' to 'Bearer' for modern standards
    headers.Authorization = `Bearer ${activeToken}`;
  }
  return headers;
}

async function fetchFromGitHub<T>(url: string, token?: string): Promise<T> {
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getDefaultBranch(owner: string, repo: string, token?: string): Promise<string> {
  const data = await fetchFromGitHub<{ default_branch: string }>(`${GITHUB_API}/repos/${owner}/${repo}`, token);
  return data.default_branch || 'main';
}

export async function getRepoFilesWithContent(
  repoUrl: string, 
  maxFiles = 30, 
  token?: string
): Promise<{ files: RepoFile[], parts: RepoParts }> {
  const parts = parseGitHubUrl(repoUrl);
  
  // Now this correctly detects if we need to look up the default branch (master vs main)
  if (!parts.branch) {
    parts.branch = await getDefaultBranch(parts.owner, parts.repo, token);
  }

  const treeData = await fetchFromGitHub<{ tree: any[] }>(
    `${GITHUB_API}/repos/${parts.owner}/${parts.repo}/git/trees/${parts.branch}?recursive=1`,
    token
  );

  const ALLOWED_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.json', '.html', '.css']);

  const candidates = treeData.tree
    .filter(t => t.type === 'blob')
    .filter(t => {
      const dot = t.path.lastIndexOf('.');
      return dot > -1 && ALLOWED_EXT.has(t.path.slice(dot).toLowerCase());
    })
    .filter(t => !t.path.includes('node_modules') && !t.path.includes('.git') && !t.path.includes('dist'))
    .slice(0, maxFiles);

  const filePromises = candidates.map(async (entry) => {
    try {
      const contentData = await fetchFromGitHub<{ content: string }>(
        `${GITHUB_API}/repos/${parts.owner}/${parts.repo}/contents/${entry.path}?ref=${parts.branch}`,
        token
      );
      
      const text = Buffer.from(contentData.content, 'base64').toString('utf-8');
      return { path: entry.path, content: text };
    } catch (e) {
      return null;
    }
  });

  const results = await Promise.all(filePromises);
  const files = results.filter((f): f is RepoFile => f !== null);

  return { files, parts };
}