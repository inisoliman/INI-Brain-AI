export type BrainStatus = 'Ready' | 'Scanning' | 'AI Working' | 'Error';

export interface FileRecord {
  path: string;
  language: string;
  size: number;
  hash: string;
  modifiedAt: number;
  imports: string[];
  exports: string[];
  summary?: string;
}

export interface DependencyGraph {
  generatedAt: string;
  edges: Record<string, string[]>;
  unresolved: Record<string, string[]>;
}

export interface ProjectMap {
  generatedAt: string;
  root: string;
  totalFiles: number;
  languages: Record<string, number>;
  coreFiles: string[];
}

export interface BrainData {
  projectMap: ProjectMap;
  fileIndex: Record<string, FileRecord>;
  dependencies: DependencyGraph;
  architecture: string;
  aiContext: string;
}

export interface CodeChange {
  path: string;
  content?: string;
  action: 'create' | 'update' | 'delete';
}
