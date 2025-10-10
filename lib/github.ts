// ./lib/github.ts
const GITHUB_API = 'https://api.github.com';

export type RepoParts = { owner: string; repo: string; branch: string };

export function parseGitHubUrl(input: string): RepoParts {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.hostname !== 'github.com') throw new Error('Must be a github.com URL');

  const parts = url.pathname.split('/').filter(Boolean); // [owner, repo, maybe 'tree', maybe branch]
  const owner = parts[0];
  const repo = parts[1];
  let branch = 'main';

  // Handle URLs like /owner/repo/tree/branch
  if (parts[2] === 'tree' && parts[3]) branch = parts[3];
  if (!owner || !repo) throw new Error('Invalid GitHub repo URL path');

  return { owner, repo, branch };
}

function ghHeaders() {
  const headers: Record<string, string> = {
    'User-Agent': 'RepoScope',
    'Accept': 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const data = await fetchJson<{ default_branch: string }>(`${GITHUB_API}/repos/${owner}/${repo}`);
  return data.default_branch || 'main';
}

type TreeEntry = { path: string; type: 'blob' | 'tree'; size?: number };

export async function fetchRepoTree(owner: string, repo: string, branch: string): Promise<TreeEntry[]> {
  // Resolve branch if needed
  const effectiveBranch = branch || (await getDefaultBranch(owner, repo));
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${effectiveBranch}?recursive=1`;
  const data = await fetchJson<{ tree: TreeEntry[] }>(url);
  return data.tree || [];
}

const ALLOWED_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.php', '.cs', '.kt', '.scala', '.swift',
  '.md', '.json', '.yml', '.yaml', '.toml', '.ini', '.sh', '.bash', '.zsh', '.sql', '.xml', '.html', '.css', '.scss', '.svelte', '.vue'
]);

function looksTextFile(path: string) {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return false;
  const ext = path.slice(dot).toLowerCase();
  return ALLOWED_EXT.has(ext);
}

export async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  maxBytes = 50_000
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURI(path)}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`Fetch raw failed for ${path} (${res.status})`);
  const buf = await res.arrayBuffer();
  const truncated = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf;
  const text = new TextDecoder('utf-8', { fatal: false }).decode(truncated);
  return text;
}

export type RepoFile = { path: string; content: string };

export async function getRepoFilesWithContent(repoUrl: string, maxFiles = 30): Promise<{ files: RepoFile[], parts: RepoParts }> {
  const parts = parseGitHubUrl(repoUrl);
  if (!parts.branch) parts.branch = await getDefaultBranch(parts.owner, parts.repo);

  const tree = await fetchRepoTree(parts.owner, parts.repo, parts.branch);
  const candidates = tree
    .filter(t => t.type === 'blob')
    .filter(t => looksTextFile(t.path))
    .slice(0, maxFiles);

  const files: RepoFile[] = [];
  for (const entry of candidates) {
    try {
      const content = await fetchRawFile(parts.owner, parts.repo, parts.branch, entry.path);
      files.push({ path: entry.path, content });
    } catch {
      // skip failed files
    }
  }
  return { files, parts };
}