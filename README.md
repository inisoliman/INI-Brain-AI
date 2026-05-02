# INI Brain AI

**INI Brain AI** is a local-first Visual Studio Code extension that builds a durable project memory for AI coding agents.

It scans your workspace, creates a `.brain/` knowledge base, generates an `AGENTS.md` operating guide, and prepares compact context that can be pasted into tools like **Cline**, Cursor, Claude Code, Copilot Chat, or any AI coding assistant.

The main goal is simple:

> Stop re-explaining your project to AI agents every session. Build a persistent, token-saving project memory once, then keep it updated.

---

## Why INI Brain AI?

AI coding agents are powerful, but they often forget your project structure, architecture decisions, and rules between sessions.

INI Brain AI helps by creating local project memory files that explain:

- What the project is.
- How the codebase is structured.
- Which files are important.
- What architecture rules must be respected.
- What tasks and decisions should continue across sessions.
- How AI agents should plan, execute, and review changes.

This makes AI agents more useful, reduces token usage, and helps future contributors understand the project faster.

---

## Key Features

### Project Scanner

- Recursively scans your workspace.
- Detects languages based on file extension.
- Extracts imports, exports, classes, functions, and lightweight summaries.
- Skips ignored folders like `.git`, `.brain`, `node_modules`, `dist`, `build`, etc.
- Skips very large files to keep scanning responsive.

### Local `.brain/` Knowledge Base

INI Brain AI creates and updates:

```text
.brain/
  project_map.json
  file_index.json
  dependencies.json
  architecture.md
  ai_context.md
  agent_context.md
  compact_context.md
  decisions.md
  tasks.md
  metadata.json
  backups/
```

### Agent Guide

Generates a root-level file:

```text
AGENTS.md
```

This file is designed for AI agents and developers. It includes:

- Project summary.
- Architecture snapshot.
- Important files.
- Planner / Executor / Reviewer workflow.
- Non-negotiable rules.
- Token-saving instructions.

### Cline Integration Workflow

INI Brain AI does not directly read Cline chat messages. Instead, it prepares context for Cline.

Use the button:

```text
Copy for Cline
```

Then paste the copied context into Cline before your task.

Example:

```md
[Paste INI Brain AI context here]

Now implement: Add user authentication and update the dashboard.
```

### Onboarding Prompt

When opening a workspace without `.brain/metadata.json` or `AGENTS.md`, INI Brain AI can prompt you to initialize the project:

```text
Scan + Agent Guide
```

This performs a scan and generates the AI agent memory files.

### AI Workflow

The extension includes a local multi-agent workflow for OpenAI-compatible APIs:

- **Planner Agent**: understands the task and creates a plan.
- **Executor Agent**: proposes or applies implementation changes.
- **Reviewer Agent**: reviews the result and highlights risks.

### Auto Mode Safety

Auto Mode can apply AI-generated file changes only when the AI returns a machine-readable JSON block.

Safety rules:

- Refuses absolute paths.
- Refuses writes outside the workspace.
- Refuses protected `.git` and `.brain` paths.
- Creates backups for existing files in `.brain/backups/`.

---

## Installation from VSIX

Download or build the `.vsix` file, for example:

```text
ini-brain-ai-1.1.0.vsix
```

Install it in VS Code:

1. Open VS Code.
2. Go to Extensions.
3. Click the three dots menu `...`.
4. Choose **Install from VSIX...**.
5. Select `ini-brain-ai-1.1.0.vsix`.
6. Run **Developer: Reload Window**.

Or install from terminal:

```bash
code --install-extension ini-brain-ai-1.1.0.vsix --force
```

---

## Quick Start

### Existing Project

1. Open your project folder in VS Code.
2. Open the INI Brain AI sidebar.
3. Click **Scan Project**.
4. The extension creates `.brain/` and `AGENTS.md`.
5. Use **Copy for Cline** before asking Cline to work on the project.

### New Empty Project

1. Open an empty folder in VS Code.
2. Click **Generate Project**.
3. The extension creates:

```text
project_request.md
```

4. Write your project requirements inside `project_request.md`.
5. Click **Generate Project** again.
6. The extension sends the request to the configured AI model and attempts to generate files.

---

## Sidebar Buttons

### Scan Project

Scans the workspace and updates:

- `.brain/`
- `AGENTS.md`
- compact AI context files

### Rebuild Brain

Performs a full rebuild of the project memory from scratch.

Use this when:

- Many files changed.
- The memory seems outdated.
- You want a clean scan.

### Ask AI

Asks the configured AI model a question about the project.

The answer appears in the VS Code Output panel under:

```text
INI Brain AI
```

Ask AI does **not** modify files.

### Auto Mode

Allows AI-generated changes to be applied to the workspace when the response contains a valid JSON changes block.

Use carefully.

### Generate Project

Used for creating a new project from `project_request.md`.

### Agent Guide

Generates or refreshes:

- `AGENTS.md`
- `.brain/agent_context.md`
- `.brain/compact_context.md`
- `.brain/decisions.md`
- `.brain/tasks.md`

### Copy for Cline

Copies compact project context to clipboard so you can paste it into Cline or another AI agent.

### Settings

Opens the settings panel for:

- API Base URL
- API Key
- Model Name

---

## Configuration

Open **INI Brain: Settings** from the sidebar or command palette.

### API Base URL

Example:

```text
https://api.puter.com/puterai/openai/v1/
```

### API Key

Stored securely using VS Code `SecretStorage`.

It is not written to `.brain/` or workspace files.

### Model Name

Example:

```text
anthropic/claude-3-5-sonnet
```

or any OpenAI-compatible model supported by your endpoint.

### Disable Onboarding Prompt

Add to VS Code settings:

```json
{
  "projectBrain.showOnboardingPrompt": false
}
```

---

## Files Created by INI Brain AI

### `AGENTS.md`

A human-readable AI agent operating guide.

Recommended for:

- Cline
- Cursor
- Claude Code
- Copilot Chat
- human contributors

### `.brain/project_map.json`

General project map:

- root path
- total indexed files
- languages
- core files

### `.brain/file_index.json`

Detailed index of scanned files:

- path
- language
- size
- hash
- imports
- exports
- summary

### `.brain/dependencies.json`

Internal dependency graph built from relative imports.

### `.brain/architecture.md`

Readable architecture summary.

### `.brain/ai_context.md`

Context for AI prompts.

### `.brain/agent_context.md`

Detailed context optimized for AI coding agents.

### `.brain/compact_context.md`

Short token-saving summary for tools like Cline.

### `.brain/decisions.md`

Durable architecture and product decisions.

### `.brain/tasks.md`

Task continuity log for long-running work.

### `.brain/backups/`

Backups created before Auto Mode modifies existing files.

---

## Recommended Workflow with Cline

1. Open the project.
2. Run **Scan Project** or **Agent Guide**.
3. Click **Copy for Cline**.
4. Paste the copied context into Cline.
5. Add your actual task below it.
6. Let Cline work with better project memory and fewer repeated explanations.
7. After major file changes, run **Scan Project** again.

---

## Development

Install dependencies:

```bash
npm install
```

Compile:

```bash
npm run compile
```

Watch mode:

```bash
npm run watch
```

Package VSIX:

```bash
npm run package
```

The generated `.vsix` file is the complete extension package.

---

## Versioning

Use semantic versioning.

### Patch release

Bug fixes only:

```bash
npm version patch --no-git-tag-version
npm run package
```

Example:

```text
1.1.0 → 1.1.1
```

### Minor release

New features:

```bash
npm version minor --no-git-tag-version
npm run package
```

Example:

```text
1.1.0 → 1.2.0
```

### Major release

Breaking changes:

```bash
npm version major --no-git-tag-version
npm run package
```

Example:

```text
1.1.0 → 2.0.0
```

---

## Publishing to VS Code Marketplace

Before publishing:

1. Create a Microsoft account.
2. Create a Visual Studio Marketplace publisher.
3. Generate an Azure DevOps Personal Access Token.
4. Update `publisher` in `package.json` from `local` to your publisher ID.
5. Make sure README, icon, license, and description are ready.
6. Run:

```bash
vsce publish
```

Or upload the `.vsix` file manually through the Marketplace publisher dashboard.

---

## Privacy

INI Brain AI is local-first.

- Scanning is performed locally.
- `.brain/` files are stored in your workspace.
- API keys are stored in VS Code SecretStorage.
- Project context is sent to the configured AI endpoint only when using Ask AI, Auto Mode, or Generate Project.

---

## License

MIT
