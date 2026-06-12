import { LlmClient } from './llmClient';

export interface AgentTranscript {
  planner: string;
  executor: string;
  reviewer: string;
}

// Karpathy-derived behavioral guardrails injected into every agent so the
// multi-agent pipeline avoids the most common LLM coding failure modes.
const KARPATHY_GUARDRAILS = [
  'Operating principles (follow strictly):',
  '1. Think before coding: state assumptions; if multiple interpretations exist, surface them instead of guessing.',
  '2. Simplicity first: the minimum code that solves the problem. No speculative features, abstractions, or config.',
  '3. Surgical changes: touch only what the request needs; match existing style; do not refactor unrelated code.',
  '4. Goal-driven: define verifiable success criteria and respect existing tests.'
].join('\n');

export class PlannerAgent {
  constructor(private llm: LlmClient) {}

  run(request: string, context: string): Promise<string> {
    return this.llm.chat(
      `You are Planner Agent. Produce a concise implementation plan with risks, files to change, and validation steps. Use markdown bullets.\n\n${KARPATHY_GUARDRAILS}`,
      `REQUEST:\n${request}\n\nCONTEXT:\n${context}`
    );
  }
}

export class ExecutorAgent {
  constructor(private llm: LlmClient) {}

  run(request: string, plan: string, context: string): Promise<string> {
    return this.llm.chat(
      // C3 fix: the contract now documents `delete` to match orchestrator.extractChanges/applyChange.
      'You are Executor Agent. Write production-ready code. When file changes are needed, output only one fenced JSON block in the format {"changes":[{"path":"...","action":"create|update|delete","content":"..."}]}. ' +
      'Use "create" for new files, "update" to overwrite an existing file with full new content, and "delete" to remove a file (omit "content" for delete). Only use "delete" when the request clearly requires removing a file.\n\n' +
      KARPATHY_GUARDRAILS,
      `REQUEST:\n${request}\n\nPLAN:\n${plan}\n\nCONTEXT:\n${context}`
    );
  }
}

export class ReviewerAgent {
  constructor(private llm: LlmClient) {}

  run(request: string, plan: string, execution: string, context: string): Promise<string> {
    return this.llm.chat(
      'You are Reviewer Agent. Inspect for bugs, security issues, edge cases, and missing compatibility. Verify imports/APIs actually exist, reject swallowed errors and hardcoded "success" returns, and ensure changes are surgical. Return the final polished answer. If code changes remain necessary, preserve the JSON block (including any delete actions).\n\n' +
      KARPATHY_GUARDRAILS,
      `REQUEST:\n${request}\n\nPLAN:\n${plan}\n\nEXECUTION:\n${execution}\n\nCONTEXT:\n${context}`
    );
  }
}

