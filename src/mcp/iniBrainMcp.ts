#!/usr/bin/env node
import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryKind, MemoryStore, parseCsvList } from '../memory/memoryStore';

const WORKSPACE = process.env.INI_BRAIN_WORKSPACE || process.cwd();

const JSON_RPC_VERSION = '2.0';

const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603
} as const;

class McpError extends Error {
  constructor(readonly code: number, message: string, readonly data?: unknown) {
    super(message);
  }
}

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface ToolArgs {
  [key: string]: unknown;
}

const TOOLS = [
  {
    name: 'ini_brain_status',
    description: 'Show INI Brain AI local workspace and memory status.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'ini_brain_save_memory',
    description: 'Save a durable project memory: decision, fact, bug, workflow note, preference, session note, or note.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Memory text to store.' },
        kind: { type: 'string', enum: ['fact', 'decision', 'preference', 'bug', 'workflow', 'session', 'note'] },
        files: { type: 'array', items: { type: 'string' }, description: 'Related project files.' },
        concepts: { type: 'array', items: { type: 'string' }, description: 'Tags/concepts.' },
        importance: { type: 'number', minimum: 1, maximum: 10 }
      },
      required: ['content']
    }
  },
  {
    name: 'ini_brain_search_memory',
    description: 'Search local INI Brain runtime memories for relevant decisions, bugs, facts, and notes.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 25 }
      },
      required: ['query']
    }
  },
  {
    name: 'ini_brain_project_profile',
    description: 'Return local project profile from .brain plus runtime memory profile.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'ini_brain_get_context',
    description: 'Build compact context for a task using .brain project files and runtime memory.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'The task or question to prepare context for.' },
        budgetChars: { type: 'number', minimum: 1000, maximum: 20000 }
      },
      required: ['task']
    }
  }
] as const;

class IniBrainMcpServer {
  private readonly memory = new MemoryStore(WORKSPACE);
  private inputBuffer = Buffer.alloc(0);
  private transportMode: 'headers' | 'lines' = 'lines';

  constructor() {
    process.on('SIGINT', async () => {
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    process.stdin.on('data', chunk => this.onData(Buffer.from(chunk)));
    process.stdin.on('error', error => console.error('[INI Brain MCP] stdin error', error));
    console.error(`[INI Brain MCP] running locally for ${WORKSPACE}`);
  }

  private onData(chunk: Buffer): void {
    this.inputBuffer = Buffer.concat([this.inputBuffer, chunk]);
    for (;;) {
      const message = this.readNextMessage();
      if (!message) {
        return;
      }
      void this.handleMessage(message).catch(error => {
        console.error('[INI Brain MCP] message error', error);
      });
    }
  }

  private readNextMessage(): JsonRpcRequest | null {
    const trimmedStart = this.inputBuffer.toString('utf8', 0, Math.min(this.inputBuffer.length, 32)).trimStart();
    if (trimmedStart.startsWith('{')) {
      return this.readNextLineMessage();
    }

    const separator = this.inputBuffer.indexOf('\r\n\r\n');
    if (separator === -1) {
      return null;
    }

    this.transportMode = 'headers';

    const header = this.inputBuffer.subarray(0, separator).toString('utf8');
    const match = /^Content-Length:\s*(\d+)$/im.exec(header);
    if (!match) {
      this.inputBuffer = Buffer.alloc(0);
      throw new McpError(ErrorCode.InvalidRequest, 'Missing Content-Length header');
    }

    const length = Number(match[1]);
    const bodyStart = separator + 4;
    const bodyEnd = bodyStart + length;
    if (this.inputBuffer.length < bodyEnd) {
      return null;
    }

    const body = this.inputBuffer.subarray(bodyStart, bodyEnd).toString('utf8');
    this.inputBuffer = this.inputBuffer.subarray(bodyEnd);
    try {
      return JSON.parse(body) as JsonRpcRequest;
    } catch (error) {
      throw new McpError(ErrorCode.ParseError, `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private readNextLineMessage(): JsonRpcRequest | null {
    const newline = this.inputBuffer.indexOf('\n');
    if (newline === -1) {
      return null;
    }

    this.transportMode = 'lines';
    const line = this.inputBuffer.subarray(0, newline).toString('utf8').trim();
    this.inputBuffer = this.inputBuffer.subarray(newline + 1);
    if (!line) {
      return this.readNextMessage();
    }

    try {
      return JSON.parse(line) as JsonRpcRequest;
    } catch (error) {
      throw new McpError(ErrorCode.ParseError, `Invalid JSON line: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleMessage(request: JsonRpcRequest): Promise<void> {
    if (!request.id && request.method?.startsWith('notifications/')) {
      return;
    }

    const id = request.id ?? null;
    try {
      if (request.jsonrpc && request.jsonrpc !== JSON_RPC_VERSION) {
        throw new McpError(ErrorCode.InvalidRequest, 'Only JSON-RPC 2.0 is supported');
      }
      if (!request.method) {
        throw new McpError(ErrorCode.InvalidRequest, 'method is required');
      }
      const result = await this.dispatch(request.method, request.params || {});
      this.writeResponse({ jsonrpc: JSON_RPC_VERSION, id, result });
    } catch (error) {
      const mcpError = toMcpError(error);
      this.writeResponse({
        jsonrpc: JSON_RPC_VERSION,
        id,
        error: { code: mcpError.code, message: mcpError.message, data: mcpError.data }
      });
    }
  }

  private async dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'ini-brain-ai', version: '1.4.1' }
        };
      case 'tools/list':
        return { tools: TOOLS };
      case 'tools/call': {
        const name = typeof params.name === 'string' ? params.name : '';
        const args = (params.arguments || {}) as ToolArgs;
        switch (name) {
          case 'ini_brain_status':
            return text(await this.status(), true);
          case 'ini_brain_save_memory':
            return text(await this.saveMemory(args), true);
          case 'ini_brain_search_memory':
            return text(await this.searchMemory(args), true);
          case 'ini_brain_project_profile':
            return text(await this.projectProfile(), true);
          case 'ini_brain_get_context':
            return text(await this.getContext(args), false);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown method: ${method}`);
    }
  }

  private writeResponse(response: JsonRpcResponse): void {
    const body = Buffer.from(JSON.stringify(response), 'utf8');
    if (this.transportMode === 'lines') {
      process.stdout.write(`${body.toString('utf8')}\n`);
      return;
    }
    process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
    process.stdout.write(body);
  }

  private async status(): Promise<Record<string, unknown>> {
    const profile = await this.memory.buildProfile();
    return {
      workspace: WORKSPACE,
      brainDir: path.join(WORKSPACE, '.brain'),
      hasBrain: await exists(path.join(WORKSPACE, '.brain', 'metadata.json')),
      hasAgentGuide: await exists(path.join(WORKSPACE, 'AGENTS.md')),
      memories: profile.totalMemories,
      generatedAt: new Date().toISOString()
    };
  }

  private async saveMemory(args: ToolArgs): Promise<Record<string, unknown>> {
    if (typeof args.content !== 'string' || !args.content.trim()) {
      throw new McpError(ErrorCode.InvalidParams, 'content is required');
    }

    const entry = await this.memory.save({
      content: args.content,
      kind: isMemoryKind(args.kind) ? args.kind : 'note',
      files: Array.isArray(args.files) ? args.files.map(String) : parseCsvList(typeof args.files === 'string' ? args.files : undefined),
      concepts: Array.isArray(args.concepts) ? args.concepts.map(String) : parseCsvList(typeof args.concepts === 'string' ? args.concepts : undefined),
      importance: typeof args.importance === 'number' ? args.importance : 7,
      source: 'cline'
    });

    return { saved: true, entry };
  }

  private async searchMemory(args: ToolArgs): Promise<Record<string, unknown>> {
    if (typeof args.query !== 'string' || !args.query.trim()) {
      throw new McpError(ErrorCode.InvalidParams, 'query is required');
    }
    const limit = typeof args.limit === 'number' ? Math.max(1, Math.min(25, Math.floor(args.limit))) : 10;
    const results = await this.memory.search(args.query, limit);
    return {
      query: args.query,
      results: results.map(result => ({
        id: result.entry.id,
        score: result.score,
        matches: result.matches,
        memory: result.entry
      }))
    };
  }

  private async projectProfile(): Promise<Record<string, unknown>> {
    const memoryProfile = await this.memory.buildProfile();
    const projectMap = await readJson(path.join(WORKSPACE, '.brain', 'project_map.json'), null);
    const architecture = await readText(path.join(WORKSPACE, '.brain', 'architecture.md'), '');
    return { workspace: WORKSPACE, projectMap, memoryProfile, architecture: architecture.slice(0, 6000) };
  }

  private async getContext(args: ToolArgs): Promise<string> {
    if (typeof args.task !== 'string' || !args.task.trim()) {
      throw new McpError(ErrorCode.InvalidParams, 'task is required');
    }
    const budgetChars = typeof args.budgetChars === 'number' ? Math.max(1000, Math.min(20000, Math.floor(args.budgetChars))) : 9000;
    const compact = await readText(path.join(WORKSPACE, '.brain', 'compact_context.md'), 'No compact context found. Run INI Brain: Scan Project first.');
    const workflow = await readText(path.join(WORKSPACE, '.brain', 'workflow.md'), '');
    const quality = await readText(path.join(WORKSPACE, '.brain', 'quality_gates.md'), '');
    const memoryContext = await this.memory.buildContext(args.task, Math.floor(budgetChars / 2));
    const combined = [
      '<ini-brain-task-context>',
      `Task: ${args.task}`,
      '',
      '## Runtime Memory',
      memoryContext,
      '',
      '## Compact Project Context',
      compact,
      '',
      workflow ? `## Workflow\n${workflow.slice(0, 2500)}` : '',
      quality ? `## Quality Gates\n${quality.slice(0, 2000)}` : '',
      '</ini-brain-task-context>',
      '',
      'Instruction for agent: use this context before editing, verify against current files, then save durable discoveries with ini_brain_save_memory.'
    ].filter(Boolean).join('\n');

    return combined.length <= budgetChars ? combined : `${combined.slice(0, budgetChars)}\n<!-- ini brain context truncated -->`;
  }
}

function text(payload: unknown, pretty: boolean): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, pretty ? 2 : 0) }] };
}

async function exists(file: string): Promise<boolean> {
  try { await fs.access(file); return true; } catch { return false; }
}

async function readText(file: string, fallback: string): Promise<string> {
  try { return await fs.readFile(file, 'utf8'); } catch { return fallback; }
}

async function readJson(file: string, fallback: unknown): Promise<unknown> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

function isMemoryKind(value: unknown): value is MemoryKind {
  return typeof value === 'string' && ['fact', 'decision', 'preference', 'bug', 'workflow', 'session', 'note'].includes(value);
}

function toMcpError(error: unknown): McpError {
  if (error instanceof McpError) {
    return error;
  }
  return new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
}

new IniBrainMcpServer().run().catch(error => {
  console.error('[INI Brain MCP] fatal error', error);
  process.exit(1);
});