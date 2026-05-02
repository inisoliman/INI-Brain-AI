# AI Agent Operating Guide

This file is maintained by INI Brain AI. Add manual project rules above the generated block if needed.

<!-- INI:BRAIN:START -->
# INI Brain AI Generated Agent Guide

Generated: 2026-05-02T20:17:06.232Z
Workspace: c:\Users\helen\Downloads\vs\exbrain
Indexed files: 21

## Project Summary
Primary languages: JSON (4), JavaScript (1), Markdown (1), TypeScript (15).
Core files: package.json, src/brain/brainStore.ts, src/types.ts, src/utils/pathUtils.ts, src/brain/agentGuide.ts, src/ai/agents.ts, src/ui/sidebarProvider.ts, src/scanner/projectScanner.ts, src/ui/settingsPanel.ts, src/ai/orchestrator.ts, src/extension.ts, src/storage/settingsService.ts, src/ai/contextBuilder.ts, src/ai/llmClient.ts, src/brain/brainManager.ts, src/brain/fileWatcher.ts, tsconfig.json.

## Architecture Snapshot
# Architecture

Generated: 2026-05-02T20:17:06.225Z

## Project Overview
- Root: c:\Users\helen\Downloads\vs\exbrain
- Total indexed files: 21

## Languages
- JSON: 4
- JavaScript: 1
- Markdown: 1
- TypeScript: 15

## Core Files
- package.json
- src/brain/brainStore.ts
- src/types.ts
- src/utils/pathUtils.ts
- src/brain/agentGuide.ts
- src/ai/agents.ts
- src/ui/sidebarProvider.ts
- src/scanner/projectScanner.ts
- src/ui/settingsPanel.ts
- src/ai/orchestrator.ts
- src/extension.ts
- src/storage/settingsService.ts
- src/ai/contextBuilder.ts
- src/ai/llmClient.ts
- src/brain/brainManager.ts
- src/brain/fileWatcher.ts
- tsconfig.json

## Dependency Hotspots (Incoming)
- src/types.ts: referenced by 7 file(s)
- src/storage/settingsService.ts: referenced by 4 file(s)
- src/brain/brainManager.ts: referenced by 3 file(s)
- src/ai/llmClient.ts: referenced by 2 file(s)
- src/scanner/projectScanner.ts: referenced by 2 file(s)
- src/utils/pathUtils.ts: referenced by 2 file(s)
- src/ai/agents.ts: referenced by 1 file(s)
- src/ai/contextBuilder.ts: referenced by 1 file(s)
- src/brain/brainStore.ts: referenced by 1 file(s)
- src/ai/orchestrator.ts: referenced by 1 file(s)
- src/brain/agentGuide.ts: referenced by 1 file(s)
- src/brain/fileWatcher.ts: referenced by 1 file(s)
- src/ui/settingsPanel.ts: referenced by 1 file(s)
- src/ui/sidebarProvider.ts: referenced by 1 file(s)

## Dependency Hotspots (Outgoing)
- src/extension.ts: 8 internal import(s)
- src/ai/orchestrator.ts: 6 internal import(s)
- src/brain/brainManager.ts: 3 internal import(s)
- src/brain/fileWatcher.ts: 2 internal import(s)
- src/scanner/projectScanner.ts: 2 internal import(s)
- src/ai/agents.ts: 1 internal import(s)
- src/ai/contextBuilder.ts: 1 internal import(s)
- src/ai/llmClient.ts: 1 internal import(s)
- src/brain/agentGuide.ts: 1 internal import(s)
- src/brain/brainStore.ts: 1 internal import(s)
- src/ui/settingsPanel.ts: 1 internal import(s)
- src/ui/sidebarProvider.ts: 1 internal import(s)
- .vscode/settings.json: 0 internal import(s)
- create-files.cjs: 0 internal import(s)
- package-lock.json: 0 internal import(s)
- package.json: 0 internal import(s)
- README.md: 0 internal import(s)
- src/storage/settingsService.ts: 0 internal import(s)
- src/types.ts: 0 internal import(s)
- src/utils/pathUtils.ts: 0 internal import(s)
- tsconfig.json: 0 internal import(s)

## Important Files for Agents
- package.json (JSON) exports: none
- tsconfig.json (JSON) exports: none
- src/brain/brainStore.ts (TypeScript) exports: BrainStore, buildProjectMap, buildDependencyGraph, buildArchitectureMarkdown, buildAiContext, resolveImport, computeIncomingDependencies, formatRecordForContext
- src/extension.ts (TypeScript) exports: deactivate, logError
- src/ai/orchestrator.ts (TypeScript) exports: AiRunResult, AppliedChange, AiOrchestrator
- src/scanner/projectScanner.ts (TypeScript) exports: ScanStats, ProjectScanner, getWorkspaceRoot
- src/brain/agentGuide.ts (TypeScript) exports: AgentGuideResult, AgentGuideGenerator, scoreRecord, formatCompactRecord, escapeRegExp
- src/utils/pathUtils.ts (TypeScript) exports: DEFAULT_IGNORES, normalizePath, isIgnoredSegment, isIgnoredPath, isTextLike, detectLanguage
- src/types.ts (TypeScript) exports: BrainStatus, FileRecord, DependencyGraph, ProjectMap, BrainData, CodeChange
- src/brain/brainManager.ts (TypeScript) exports: BrainManager
- src/ui/sidebarProvider.ts (TypeScript) exports: SidebarProvider, escapeHtml, getNonce
- src/ui/settingsPanel.ts (TypeScript) exports: SettingsPanel, esc, getNonce
- src/ai/agents.ts (TypeScript) exports: AgentTranscript, PlannerAgent, ExecutorAgent, ReviewerAgent
- src/ai/contextBuilder.ts (TypeScript) exports: ContextBuildResult, ContextBuilder
- src/brain/fileWatcher.ts (TypeScript) exports: BrainFileWatcher

## Agent Workflow
### Planner Agent
- Understand the user request and inspect AGENTS.md/.brain context first.
- Identify impacted files and risks before editing.
- Prefer a small plan with explicit success criteria.

### Executor Agent
- Implement minimal compatible changes following existing code style.
- Keep domain boundaries and existing architecture intact.
- Never write secrets/API keys into repository files.

### Reviewer Agent
- Check whether the requested behavior is actually satisfied.
- Look for regressions, unsafe writes, missing tests/build failures, and architecture drift.
- Summarize changes and remaining risks.

## Non-Negotiable Rules
- Do not modify `.git/` or `.brain/backups/`.
- Do not expose API keys, tokens, or credentials.
- Prefer incremental changes over rewrites.
- Update `.brain/tasks.md` for notable pending work.
- Update `.brain/decisions.md` for important architecture decisions.

## Token-Saving Instructions for AI Agents
- Start by reading this file and `.brain/compact_context.md`.
- Only open full source files that are directly relevant to the request.
- Use `.brain/architecture.md` for project map and hotspots.
- Ask for clarification when requirements are ambiguous.
<!-- INI:BRAIN:END -->
