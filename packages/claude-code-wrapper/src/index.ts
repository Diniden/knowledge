// Claude Code CLI wrapper — Phase 3 (Agent Integration)
//
// This package wraps the `claude` terminal application as a subprocess.
// The server spawns Claude Code processes, injects prompts via stdin, and
// parses structured output (stream-json) from stdout. The server never calls
// the Anthropic model API directly — Claude Code handles all LLM interaction
// internally.
//
// See: plans/06-AGENT-SYSTEM/02-CLAUDE-CODE-WRAPPER-PLAN.md
export {};
