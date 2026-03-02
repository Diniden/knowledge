# .claude/ — Claude Code Development Configuration

This directory contains configuration specific to **Claude Code** development sessions.

## Purpose

These files help developers use Claude Code to build this project. They are **development-time** artifacts — nothing in this directory is deployed or used at runtime by the application.

## Contents

- `settings.json` — Claude Code session settings (when applicable)
- `commands/` — Custom Claude Code commands (when applicable)

## Relationship to Other Config

| Config Location       | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| Root `CLAUDE.md`      | Master context loaded by every Claude Code session |
| `.claude/` (this dir) | Claude Code-specific settings and commands         |
| `.cursor/rules/`      | Cursor AI rule files (glob-matched to file types)  |
| `.cursor/skills/`     | Cursor skill files (SKILL.md format)               |
| `scripts/ai-dev/`     | Validation and management scripts                  |
| `docs/ai-dev/`        | Documentation about the AI dev config system       |

## Not to Be Confused With

The **application's runtime agent configuration** lives in `server/src/modules/agent/` and `server/agents/`. Those files configure how the deployed application uses AI agents to serve end users. See `BOUNDARY.md` at the project root for the full boundary reference.
