# AI Agent Operating Guide

This file is maintained by INI Brain AI. Add manual project rules above the generated block if needed.

<!-- INI:BRAIN:START -->
# INI Brain AI Generated Agent Guide

Generated: 2026-06-11T17:05:59.160Z
Workspace: c:\Users\helen\Downloads\vs\exbrain
Indexed files: 521

## Project Summary
Primary languages: Markdown (174), JSON (37), TypeScript (230), YAML (15), JavaScript (18), CSS (2), PowerShell (1), Shell (1), Python (6), HTML (1), TypeScript React (36).
Core files: package.json, .tmp/research/understand/understand-anything-plugin/packages/dashboard/package.json, .tmp/research/understand/understand-anything-plugin/packages/core/package.json, .tmp/research/understand/understand-anything-plugin/package.json, .tmp/research/understand/package.json, .tmp/research/understand/homepage/package.json, INI Brain AI/package.json, .tmp/agentmemory_raw/package.json, .tmp/research/understand/understand-anything-plugin/packages/core/src/types.ts, .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/__tests__/php-extractor.test.ts, .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/__tests__/python-extractor.test.ts, .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/store.ts, .tmp/research/understand/understand-anything-plugin/packages/core/src/schema.ts, src/brain/agentGuide.ts, src/memory/memoryStore.ts, .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/__tests__/ruby-extractor.test.ts, INI Brain AI/src/brain/agentGuide.ts, .tmp/research/understand/understand-anything-plugin/packages/core/src/fingerprint.ts, INI Brain AI/src/memory/memoryStore.ts, .tmp/research/understand/understand-anything-plugin/packages/core/src/persistence/index.ts.

## Agent Knowledge Files
- `.brain/compact_context.md` - short token-saving project context.
- `.brain/workflow.md` - required project workflow from planning to review.
- `.brain/skills.md` - index of detected skills and when to use them.
- `.brain/skills/*.md` - detailed playbooks for specific technologies/tasks.
- `.brain/quality_gates.md` - checks to run before final delivery.
- `.brain/decisions.md` - durable architecture/product decisions.
- `.brain/tasks.md` - resumable task and continuity log.

## Detected Skills
- General Project Maintenance: .brain/skills/general-project-maintenance.md
- Node Package Management: .brain/skills/node-package-management.md
- TypeScript Development: .brain/skills/typescript-development.md
- VS Code Extension Development: .brain/skills/vscode-extension-development.md
- VS Code Webview UI: .brain/skills/vscode-webview-ui.md
- React Frontend Development: .brain/skills/react-frontend-development.md
- Python Development: .brain/skills/python-development.md
- Agent Memory and Context Engineering: .brain/skills/agent-memory-and-context.md
- Release and VSIX Packaging: .brain/skills/release-and-vsix-packaging.md

## Architecture Snapshot
# Architecture

Generated: 2026-06-11T17:05:59.142Z

## Project Overview
- Root: c:\Users\helen\Downloads\vs\exbrain
- Total indexed files: 521

## Languages
- Markdown: 174
- JSON: 37
- TypeScript: 230
- YAML: 15
- JavaScript: 18
- CSS: 2
- PowerShell: 1
- Shell: 1
- Python: 6
- HTML: 1
- TypeScript React: 36

## Core Files
- package.json
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/package.json
- .tmp/research/understand/understand-anything-plugin/packages/core/package.json
- .tmp/research/understand/understand-anything-plugin/package.json
- .tmp/research/understand/package.json
- .tmp/research/understand/homepage/package.json
- INI Brain AI/package.json
- .tmp/agentmemory_raw/package.json
- .tmp/research/understand/understand-anything-plugin/packages/core/src/types.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/__tests__/php-extractor.test.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/__tests__/python-extractor.test.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/store.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/schema.ts
- src/brain/agentGuide.ts
- src/memory/memoryStore.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/__tests__/ruby-extractor.test.ts
- INI Brain AI/src/brain/agentGuide.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/fingerprint.ts
- INI Brain AI/src/memory/memoryStore.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/persistence/index.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/utils/layout.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/tree-sitter-plugin.test.ts
- src/brain/insightBuilder.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/kotlin-extractor.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/languages/types.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/utils/elk-layout.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/utils/edgeAggregation.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/GraphView.tsx
- .tmp/research/understand/understand-anything-plugin/packages/core/src/analyzer/normalize-graph.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/utils/containers.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/csharp-extractor.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/analyzer/llm-analyzer.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/analyzer/language-lesson.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/analyzer/layer-detector.ts
- INI Brain AI/src/brain/brainStore.ts
- src/brain/brainStore.ts
- src/extension.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/themes/types.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/App.tsx
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/java-extractor.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/cpp-extractor.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/themes/ThemeContext.tsx
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/locales/index.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/FileExplorer.tsx
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/DomainGraphView.tsx
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/rust-extractor.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/php-extractor.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/go-extractor.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/base-extractor.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/discovery.ts
- .tmp/research/understand/understand-anything-plugin/packages/core/src/change-classifier.ts
- .tmp/agentmemory_raw/src/mcp/rest-proxy.ts
- src/mcp/iniBrainMcp.ts
- src/brain/guardSkills.ts
- src/ai/agents.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/utils/__tests__/filters.test.ts
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/NodeInfo.tsx
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/KnowledgeGraphView.tsx
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/CodeViewer.tsx
- .tmp/research/understand/understand-anything-plugin/packages/core/src/staleness.ts

## Dependency Hotspots (Incoming)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/store.ts: referenced by 24 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/contexts/I18nContext.tsx: referenced by 21 file(s)
- src/types.ts: referenced by 9 file(s)
- INI Brain AI/src/types.ts: referenced by 7 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/LayerLegend.tsx: referenced by 5 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/utils/elk-layout.ts: referenced by 4 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/utils/layout.ts: referenced by 4 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/themes/types.ts: referenced by 4 file(s)
- INI Brain AI/src/storage/settingsService.ts: referenced by 4 file(s)
- src/storage/settingsService.ts: referenced by 4 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/themes/index.ts: referenced by 3 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/CustomNode.tsx: referenced by 3 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/themes/presets.ts: referenced by 3 file(s)
- INI Brain AI/src/brain/brainManager.ts: referenced by 3 file(s)
- src/brain/brainManager.ts: referenced by 3 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/DiffToggle.tsx: referenced by 2 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/DomainGraphView.tsx: referenced by 2 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/ExportMenu.tsx: referenced by 2 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/FileExplorer.tsx: referenced by 2 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/FilterPanel.tsx: referenced by 2 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/GraphView.tsx: referenced by 2 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/KnowledgeGraphView.tsx: referenced by 2 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/NodeInfo.tsx: referenced by 2 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/PersonaSelector.tsx: referenced by 2 file(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/ProjectOverview.tsx: referenced by 2 file(s)

## Dependency Hotspots (Outgoing)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/App.tsx: 21 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/GraphView.tsx: 12 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/MobileLayout.tsx: 12 internal import(s)
- src/extension.ts: 10 internal import(s)
- INI Brain AI/src/extension.ts: 9 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/MobileDrawer.tsx: 8 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/DomainGraphView.tsx: 7 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/locales/index.ts: 6 internal import(s)
- INI Brain AI/src/ai/orchestrator.ts: 6 internal import(s)
- src/ai/orchestrator.ts: 6 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/themes/index.ts: 4 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/ExportMenu.tsx: 3 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/KnowledgeGraphView.tsx: 3 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/themes/ThemeContext.tsx: 3 internal import(s)
- INI Brain AI/src/brain/brainManager.ts: 3 internal import(s)
- src/brain/brainManager.ts: 3 internal import(s)
- src/mcp/iniBrainMcp.ts: 3 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/Breadcrumb.tsx: 2 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/CodeViewer.tsx: 2 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/DiffToggle.tsx: 2 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/FileExplorer.tsx: 2 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/FilterPanel.tsx: 2 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/KeyboardShortcutsHelp.tsx: 2 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/LayerLegend.tsx: 2 internal import(s)
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/components/LearnPanel.tsx: 2 internal import(s)

## Important Files for Agents
- package.json (JSON) exports: none
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/package.json (JSON) exports: none
- .tmp/research/understand/understand-anything-plugin/packages/core/package.json (JSON) exports: none
- .tmp/research/understand/understand-anything-plugin/package.json (JSON) exports: none
- .tmp/research/understand/package.json (JSON) exports: none
- .tmp/research/understand/homepage/package.json (JSON) exports: none
- INI Brain AI/package.json (JSON) exports: none
- .tmp/agentmemory_raw/package.json (JSON) exports: none
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/__tests__/python-extractor.test.ts (TypeScript) exports: hello, add, greet, noop, connect, flexible, decorated_func, api_handler
- .tmp/research/understand/understand-anything-plugin/packages/dashboard/src/store.ts (TypeScript) exports: Persona, NavigationLevel, NodeType, Complexity, EdgeCategory, ViewMode, DetailLevel, FilterState
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/__tests__/php-extractor.test.ts (TypeScript) exports: parse, helper, greet, noReturn, noop, multiline, __construct, getUser
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/tree-sitter-plugin.test.ts (TypeScript) exports: greet, add, Logger, AppController, Options, Server, createServer, DEFAULT_PORT
- .tmp/research/understand/understand-anything-plugin/packages/core/src/plugins/extractors/__tests__/ruby-extractor.test.ts (TypeScript) exports: hello, add, connect, flexible, compute, multiline, initialize, find_user
- src/brain/agentGuide.ts (TypeScript) exports: AgentGuideResult, AgentGuideGenerator, generalMaintenanceSkill, nodePackageSkill, typescriptSkill, vscodeExtensionSkill, webviewSkill, reactFrontendSkill
- .tmp/research/understand/understand-anything-plugin/packages/core/src/types.ts (TypeScript) exports: NodeType, EdgeType, KnowledgeMeta, DomainMeta, GraphNode, GraphEdge, Layer, TourStep

## Required Agent Workflow
1. Read this file and `.brain/compact_context.md` first.
2. Select the relevant skill from `.brain/skills.md`.
3. Follow `.brain/workflow.md` before editing.
4. Apply `.brain/quality_gates.md` before final response.

### Planner Agent
- Understand the user request and inspect AGENTS.md/.brain context first.
- Identify impacted files, matching skills, risks, and success criteria before editing.
- Prefer a small plan with explicit verification steps.

### Executor Agent
- Implement minimal compatible changes following existing code style.
- Keep domain boundaries and existing architecture intact.
- Never write secrets/API keys into repository files.

### Reviewer Agent
- Check whether the requested behavior is actually satisfied.
- Look for regressions, unsafe writes, missing tests/build failures, and architecture drift.
- Summarize changes, verification performed, and remaining risks.

## Non-Negotiable Rules
- Do not modify `.git/` or `.brain/backups/`.
- Do not expose API keys, tokens, or credentials.
- Prefer incremental changes over rewrites.
- Update `.brain/tasks.md` for notable pending work.
- Update `.brain/decisions.md` for important architecture decisions.

## Token-Saving Instructions for AI Agents
- Start by reading this file and `.brain/compact_context.md`.
- Use `.brain/skills.md` to avoid rediscovering project conventions.
- Only open full source files that are directly relevant to the request.
- Use `.brain/architecture.md` for project map and hotspots.
- Ask for clarification when requirements are ambiguous.
<!-- INI:BRAIN:END -->
