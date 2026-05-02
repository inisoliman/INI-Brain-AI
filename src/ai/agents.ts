import { LlmClient } from './llmClient';

export interface AgentTranscript {
  planner: string;
  executor: string;
  reviewer: string;
}

export class PlannerAgent {
  constructor(private llm: LlmClient) {}

  run(request: string, context: string): Promise<string> {
    return this.llm.chat(
      'You are Planner Agent. Produce a concise implementation plan with risks, files to change, and validation steps. Use markdown bullets.',
      `REQUEST:\n${request}\n\nCONTEXT:\n${context}`
    );
  }
}

export class ExecutorAgent {
  constructor(private llm: LlmClient) {}

  run(request: string, plan: string, context: string): Promise<string> {
    return this.llm.chat(
      'You are Executor Agent. Write production-ready code. When file changes are needed, output only one fenced JSON block in the format {"changes":[{"path":"...","action":"create|update","content":"..."}]}.',
      `REQUEST:\n${request}\n\nPLAN:\n${plan}\n\nCONTEXT:\n${context}`
    );
  }
}

export class ReviewerAgent {
  constructor(private llm: LlmClient) {}

  run(request: string, plan: string, execution: string, context: string): Promise<string> {
    return this.llm.chat(
      'You are Reviewer Agent. Inspect for bugs, security issues, edge cases, and missing compatibility. Return the final polished answer. If code changes remain necessary, preserve the JSON block.',
      `REQUEST:\n${request}\n\nPLAN:\n${plan}\n\nEXECUTION:\n${execution}\n\nCONTEXT:\n${context}`
    );
  }
}
