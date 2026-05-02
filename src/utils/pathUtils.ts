import * as path from 'path';

export const DEFAULT_IGNORES = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.brain',
  'vendor', '__pycache__', '.cache', '.turbo', '.parcel-cache', 'target', 'bin', 'obj'
]);

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.php', '.py', '.java', '.cs',
  '.go', '.rs', '.rb', '.html', '.css', '.scss', '.md', '.yml', '.yaml', '.xml', '.vue',
  '.svelte', '.toml', '.ini', '.env', '.sh', '.ps1', '.sql'
]);

export function normalizePath(p: string): string {
  return p.split(path.sep).join('/');
}

export function isIgnoredSegment(segment: string): boolean {
  return DEFAULT_IGNORES.has(segment) || segment.endsWith('.log');
}

export function isIgnoredPath(filePath: string): boolean {
  return normalizePath(filePath).split('/').some(isIgnoredSegment);
}

export function isTextLike(file: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase());
}

export function detectLanguage(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TypeScript React', '.js': 'JavaScript', '.jsx': 'JavaScript React',
    '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.php': 'PHP', '.py': 'Python', '.json': 'JSON',
    '.md': 'Markdown', '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.java': 'Java', '.cs': 'C#',
    '.go': 'Go', '.rs': 'Rust', '.rb': 'Ruby', '.vue': 'Vue', '.svelte': 'Svelte', '.yml': 'YAML',
    '.yaml': 'YAML', '.xml': 'XML', '.toml': 'TOML', '.ini': 'INI', '.env': 'Environment',
    '.sh': 'Shell', '.ps1': 'PowerShell', '.sql': 'SQL'
  };
  return map[ext] || 'Text';
}
