/**
 * Built-in "guard" quality skills, adapted from guard-skills (clean-code/test)
 * and andrej-karpathy-skills (behavioral guidelines). These are always-on
 * skills injected by the agent guide so any AI agent (Cline/Claude/Cursor)
 * gets the same high-leverage quality gates.
 */

export interface GuardSkill {
  id: string;
  name: string;
  description: string;
  body: string;
}

const CLEAN_CODE_GUARD: GuardSkill = {
  id: 'clean-code-guard',
  name: 'clean-code-guard',
  description: 'Review generated or changed production code before it ships, using Clean Code, SOLID, DRY, KISS, YAGNI, and LLM-specific failure-mode checks. Use reactively after writing/editing/refactoring code, before presenting, committing, or merging.',
  body: [
    '# clean-code-guard',
    '',
    'Run this as a guard pass after generating or editing code, before presenting or committing. Fix every violation first.',
    '',
    '## Always-applied imperatives',
    '1. Names reveal intent. Avoid `data`, `result`, `temp`, `value`, `obj`, `handle_*`, `process_*` without a qualifier.',
    '2. Functions stay small (target ≤20 lines), one level of abstraction, one thing.',
    '3. Four arguments is the hard ceiling; never use boolean flag arguments — split into two functions.',
    '4. A function returns a value (query) OR has a side effect (command), never both.',
    '5. Comments explain *why*, never *what*. Delete commented-out code and step-number scaffolding.',
    '6. Match the file\'s existing style — read the file and one neighbor before writing.',
    '7. One actor per module (SRP). Extension via new code, not edits (OCP).',
    '8. Delete duplicated *knowledge*, not duplicated *text*. The wrong abstraction is worse than duplication.',
    '9. Complexity ceiling: cyclomatic ≤10, nesting ≤5.',
    '10. No speculative anything — no flag/config/interface/factory without a present-day caller.',
    '',
    '## AI-specific guardrails (highest leverage)',
    '11. Never swallow errors with broad catch-all handling. Catch only what you can recover from.',
    '12. No defensive guards for impossible cases the type/contract already excludes.',
    '13. Verify every import and external call actually exists in the installed version (no hallucinated APIs).',
    '14. No hardcoded "success" returns or mock fixtures in production code. Never weaken a test to make it pass.',
    '15. Re-derive from spec; do not copy-from-similar (off-by-one and null bugs enter that way).',
    '16. Enumerate boundary cases (null/empty/one/many, off-by-one, unicode) before writing them.',
    '17. Strip dead code (unused imports/symbols/branches) before delivery.',
    '18. Read before write: read the file, one neighbor, and project rules (AGENTS.md) first.',
    '19. Preserve observable behavior when refactoring. A bug fix and a refactor are two separate changes.',
    '',
    '## Self-check before delivery',
    '- Walk imperatives 1–19 against your diff and fix violations.',
    '- New functions: lines ≤20? params ≤4? names reveal intent?',
    '- New error handling: specific error type? handler does more than silently return?',
    '- New abstraction: is there a second concrete user today? If not, inline it.',
    '- Any hardcoded "ok" return or fixture data? Replace with a real implementation or explicit failure.'
  ].join('\n')
};

const TEST_GUARD: GuardSkill = {
  id: 'test-guard',
  name: 'test-guard',
  description: 'Review or write tests so they actually verify behavior. Use after generating tests, before relying on them, or when asked to add/fix tests.',
  body: [
    '# test-guard',
    '',
    'Run this when writing or reviewing tests. Tests must fail for the right reason and verify real behavior.',
    '',
    '## Imperatives',
    '1. A test must be able to fail. If it cannot fail, it tests nothing.',
    '2. Test behavior and contracts, not implementation details.',
    '3. No hardcoded fixture values masquerading as assertions on real output.',
    '4. Never disable, skip, or weaken a test to make a suite pass — fix the code or the test honestly.',
    '5. Cover boundaries: null/empty/one/many, error paths, and the documented edge cases.',
    '6. One logical assertion focus per test; name the test after the behavior it pins down.',
    '7. Tests must be deterministic — no reliance on time, ordering, network, or randomness without control.',
    '8. For bug fixes: write a test that reproduces the bug first, then make it pass.',
    '',
    '## Self-check',
    '- Did I run the tests and watch them pass for the right reason?',
    '- Would these tests catch a regression if the implementation broke?',
    '- Are there any always-true assertions or `expect(true).toBe(true)` placeholders? Remove them.'
  ].join('\n')
};

const KARPATHY_GUIDELINES: GuardSkill = {
  id: 'karpathy-guidelines',
  name: 'karpathy-guidelines',
  description: 'Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.',
  body: [
    '# karpathy-guidelines',
    '',
    'Behavioral guidelines to reduce common LLM coding mistakes. Bias toward caution over speed; for trivial tasks use judgment.',
    '',
    '## 1. Think Before Coding',
    '- State assumptions explicitly. If uncertain, ask.',
    '- If multiple interpretations exist, present them — do not pick silently.',
    '- If a simpler approach exists, say so. If something is unclear, stop and name it.',
    '',
    '## 2. Simplicity First',
    '- Minimum code that solves the problem. No features beyond what was asked.',
    '- No abstractions for single-use code. No flexibility/configurability that was not requested.',
    '- If you wrote 200 lines and it could be 50, rewrite it.',
    '',
    '## 3. Surgical Changes',
    '- Touch only what you must. Do not "improve" adjacent code, comments, or formatting.',
    '- Match existing style. Remove only orphans YOUR change created; leave pre-existing dead code (mention it).',
    '- Every changed line should trace directly to the request.',
    '',
    '## 4. Goal-Driven Execution',
    '- Turn tasks into verifiable goals ("add validation" → "write tests for invalid inputs, then make them pass").',
    '- For multi-step tasks, state a brief plan with a verify-check per step.'
  ].join('\n')
};

export const GUARD_SKILLS: GuardSkill[] = [KARPATHY_GUIDELINES, CLEAN_CODE_GUARD, TEST_GUARD];

/** Render a guard skill as a SKILL.md document with frontmatter (Cline/Claude compatible). */
export function renderGuardSkillFile(skill: GuardSkill): string {
  return [
    '---',
    `name: ${skill.name}`,
    `description: ${skill.description}`,
    'license: MIT',
    '---',
    '',
    skill.body,
    ''
  ].join('\n');
}

/** A compact quality-gates section combining all guards, for quality_gates.md. */
export function buildGuardsQualitySection(): string {
  const lines: string[] = [];
  lines.push('## Built-in Quality Guards');
  lines.push('');
  lines.push('Run these guard passes after generating/editing code, before presenting or committing:');
  lines.push('');
  for (const skill of GUARD_SKILLS) {
    lines.push(`### ${skill.name}`);
    lines.push(skill.description);
    lines.push(`See \`.brain/skills/${skill.id}.md\` for the full checklist.`);
    lines.push('');
  }
  return lines.join('\n');
}
