# 12 — CODE GENERATION PLAN

> **Purpose**: Define the complete code generation pipeline — the ultimate output
> of the Knowledge Graph Agent System. This plan covers plan execution via Claude
> Code, code repository management, delta builds (incremental changes), full
> builds (from scratch), test verification, CI/CD integration, quality assurance,
> rollback mechanisms, and execution monitoring.
>
> **Phase**: 4 (Advanced Features)
> **Dependencies**: `06-AGENT-SYSTEM/05-PLAN-GENERATION-PLAN.md`, `03-SERVER/05-GIT-INTEGRATION-PLAN.md`
> **Estimated tasks**: 135+

---

## Table of Contents

1. [Plan Execution Pipeline](#1-plan-execution-pipeline)
2. [Code Repository Management](#2-code-repository-management)
3. [Delta Builds](#3-delta-builds)
4. [Full Builds](#4-full-builds)
5. [Test Verification](#5-test-verification)
6. [CI/CD Integration](#6-cicd-integration)
7. [Quality Assurance](#7-quality-assurance)
8. [Rollback & Recovery](#8-rollback--recovery)
9. [Execution Monitoring](#9-execution-monitoring)
10. [Cost & Resource Management](#10-cost--resource-management)
11. [Output Artifact Management](#11-output-artifact-management)

---

## 1. Plan Execution Pipeline

### 1.1 Plan Loading & Parsing

- [ ] **CG-PE-001**: Implement plan loader service
  - `PlanLoaderService` in `server/src/modules/code-generation/`
  - Load plan from the knowledge graph's plan directory structure
  - Parse the master prompt plan document (Markdown format)
  - Validate plan structure: required sections, valid spec references, execution order
  - Return: `ParsedPlan` with ordered list of execution steps
- [ ] **CG-PE-002**: Define plan step schema
  - Each plan step: `{ id, title, description, specReferences: string[], dependencies: string[], estimatedDuration, executionType: 'create' | 'modify' | 'delete' | 'configure' }`
  - Steps reference source specs by ID (traceability to knowledge graph)
  - Steps declare dependencies on other steps (execution ordering)
  - Steps include expected output description (for verification)
- [ ] **CG-PE-003**: Implement plan validation
  - Verify all spec references resolve to existing specs
  - Verify dependency graph has no cycles
  - Verify all dependencies reference existing steps
  - Verify plan completeness: covers all specs in the target subgraph
  - Return validation errors with specific failure reasons
- [ ] **CG-PE-004**: Implement execution order determination
  - Build a DAG from step dependencies
  - Topological sort to determine execution order
  - Identify parallelizable steps (no mutual dependencies)
  - Group steps into execution phases (parallel within phase, sequential across phases)
  - Optimize: minimize total phases (maximize parallelism)

### 1.2 Execution Context Assembly

- [ ] **CG-PE-005**: Implement execution context builder
  - `ExecutionContextBuilder` assembles the context for each Claude Code invocation
  - Context includes: step description, relevant spec content (full text), project conventions, existing codebase state
  - Context includes: output from previous steps (if dependent)
  - Context includes: target repository structure and file listing
  - Size management: prioritize most relevant specs, truncate if context exceeds limits
- [ ] **CG-PE-006**: Implement spec content resolution for context
  - For each step, resolve referenced specs and their transitive dependencies
  - Include: spec content, related specs (1-hop edges), relevant RAG results
  - Respect permission boundaries (only include specs the user has access to)
  - Decrypt encrypted specs if the user has access tokens
- [ ] **CG-PE-007**: Implement codebase state snapshot for context
  - Before each step, capture the current state of relevant files in the target repo
  - Include: file tree listing, content of files the step will modify
  - For create steps: include nearby file contents for style consistency
  - For modify steps: include the full current file content
- [ ] **CG-PE-008**: Implement project convention injection
  - Load project coding conventions from a `.codegen-config.json` or equivalent
  - Conventions: language, framework, style guide, naming conventions, directory structure
  - Inject conventions into every Claude Code prompt
  - Allow per-project customization

### 1.3 Step Execution via Claude Code

- [ ] **CG-PE-009**: Implement step executor service
  - `StepExecutorService` executes a single plan step via Claude Code
  - Assemble the prompt: context + step instructions + output expectations
  - Invoke Claude Code wrapper (from Agent System plan)
  - Capture: generated files, modified files, console output, exit status
  - Timeout: configurable per step (default: 5 minutes)
- [ ] **CG-PE-010**: Implement prompt template for code generation steps
  - Template includes: role definition, project context, step instructions, output format
  - Role: "You are a code generation agent working on {project_name}"
  - Instructions: the step description from the plan
  - Output format: specify file paths and content expectations
  - Include examples of expected output quality
- [ ] **CG-PE-011**: Implement step output capture
  - Capture all files created or modified by Claude Code
  - Capture stdout and stderr from the agent process
  - Capture the agent's own status reporting (success, partial, failure)
  - Store captured output for later verification and display
- [ ] **CG-PE-012**: Implement step retry logic
  - If a step fails, retry up to 2 times with refined context
  - On retry, include the error message from the previous attempt
  - Exponential backoff: 10 seconds, 30 seconds between retries
  - If all retries fail, mark step as failed and pause execution
- [ ] **CG-PE-013**: Implement step output validation
  - After each step, validate the output meets expectations
  - Check: expected files exist, files have non-zero content
  - Check: TypeScript files parse without syntax errors
  - Check: no obvious security issues (hardcoded secrets, eval usage)
  - Store validation results with the step execution record

### 1.4 Pipeline Orchestration

- [ ] **CG-PE-014**: Implement pipeline orchestrator
  - `PipelineOrchestrator` manages the execution of all steps in a plan
  - Execute steps in dependency order (topological sort)
  - Execute independent steps in parallel (configurable concurrency limit)
  - Pause on step failure (configurable: pause or skip-and-continue)
  - Track overall pipeline progress (steps completed / total steps)
- [ ] **CG-PE-015**: Implement pipeline state machine
  - States: `pending`, `running`, `paused`, `completed`, `failed`, `cancelled`
  - Transitions: pending→running, running→paused (on failure or user action), paused→running (resume), running→completed, running→failed, *→cancelled
  - Persist state to database for recovery after server restart
  - Resume from the last completed step on recovery
- [ ] **CG-PE-016**: Implement pipeline pause and resume
  - User can pause a running pipeline
  - Pause completes the currently executing step, then stops
  - Resume continues from the next unexecuted step
  - Useful for reviewing intermediate results or adjusting the plan
- [ ] **CG-PE-017**: Implement pipeline cancellation
  - User can cancel a running pipeline
  - Kill all active step execution processes
  - Mark remaining steps as cancelled
  - Optionally rollback changes made by completed steps

---

## 2. Code Repository Management

### 2.1 Target Repository Initialization

- [ ] **CG-CR-001**: Implement target repository initialization
  - Create a new git repository for the generated code
  - Directory: `data/generated/{user_id}/{project_id}/{repo_name}/`
  - Initialize with: README.md, .gitignore, package.json (from project conventions)
  - Set git user identity for code generation commits
  - Store repository metadata in database
- [ ] **CG-CR-002**: Implement target repository from template
  - Support initializing from a template repository
  - Templates: React app, NestJS server, monorepo, library
  - Templates stored in `config/code-gen-templates/`
  - User selects template during project setup or first code generation
- [ ] **CG-CR-003**: Implement target repository linking
  - Link the target code repository to the knowledge graph project
  - One project can have multiple target repositories (frontend, backend, etc.)
  - Store link: `project_code_repos` (project_id, repo_path, repo_type, created_at)
  - Support external repository targets (GitHub repo URL)

### 2.2 Commit Strategy

- [ ] **CG-CR-004**: Implement per-step commit strategy
  - After each successful plan step, commit the changes
  - Commit message: `[CodeGen] Step {step_id}: {step_title}`
  - Include step metadata in commit body: spec references, plan ID, execution timestamp
  - Each commit is atomic — represents one logical unit of generated code
- [ ] **CG-CR-005**: Implement per-phase commit strategy (alternative)
  - Commit after each execution phase (group of parallel steps)
  - Commit message: `[CodeGen] Phase {phase_number}: {phase_summary}`
  - Fewer commits but larger changesets
  - User configures preferred strategy in project settings
- [ ] **CG-CR-006**: Implement commit metadata for traceability
  - Git notes or commit trailer for machine-readable metadata
  - Trailer: `Spec-Refs: {spec_id_1}, {spec_id_2}`
  - Trailer: `Plan-Step: {step_id}`
  - Trailer: `Execution-Id: {execution_id}`
  - Enables querying: "which commits were generated from this spec?"
- [ ] **CG-CR-007**: Implement commit signature for generated code
  - Sign generated code commits with a dedicated GPG key
  - Distinguishes generated code from human-written code
  - Signature: "Generated by KG Agent System"
  - Verification: `git log --show-signature` shows generation origin

### 2.3 Branch Strategy for Generated Code

- [ ] **CG-CR-008**: Implement branch-per-execution strategy
  - Each code generation execution creates a new branch
  - Branch name: `codegen/{execution_id}` or `codegen/{timestamp}`
  - User reviews generated code on the branch before merging to `main`
  - Supports multiple concurrent executions on different branches
- [ ] **CG-CR-009**: Implement branch merge after successful execution
  - After execution completes and all verifications pass
  - Auto-merge to main (if configured) or create a pull request
  - If merge conflicts with main, pause for human resolution
  - Track merge status in execution record
- [ ] **CG-CR-010**: Implement branch cleanup
  - Delete codegen branches after successful merge
  - Retain branches for failed executions (for debugging)
  - Configurable retention: keep last N branches or branches younger than N days

### 2.4 Spec-to-Code Linking

- [ ] **CG-CR-011**: Implement bidirectional spec-to-code mapping
  - Track which source specs produced which code files
  - Forward: `spec_id → [file_path_1, file_path_2, ...]`
  - Reverse: `file_path → [spec_id_1, spec_id_2, ...]`
  - Store in database: `spec_code_mappings` (spec_id, repo_id, file_path, last_generated_at)
- [ ] **CG-CR-012**: Implement code provenance tracking
  - For each generated file, record: source specs, plan step, execution ID, timestamp
  - Store as a `.codegen-provenance.json` in the repository root
  - Machine-readable format for tooling integration
  - Update on each code generation execution
- [ ] **CG-CR-013**: Implement "source spec" link in generated code
  - Add a comment at the top of generated files: `// Generated from specs: {spec_ids}`
  - Or: add a source map-style comment linking to the knowledge graph
  - Configurable: on/off per project (some users may not want these comments)

---

## 3. Delta Builds

### 3.1 Change Detection

- [ ] **CG-DB-001**: Implement spec change detection since last execution
  - Compare current spec versions with versions at last execution
  - Use git commit hashes: `last_execution_commit` stored in execution history
  - Detect: new specs, modified specs, deleted specs
  - Return: `ChangeSet { added: Spec[], modified: Spec[], deleted: Spec[] }`
- [ ] **CG-DB-002**: Implement change impact analysis via graph traversal
  - For each changed spec, traverse the knowledge graph to find affected areas
  - Traversal: follow edges (depends-on, derived-from) to find downstream specs
  - Include specs that transitively depend on changed specs
  - Depth limit: configurable (default: 3 hops)
  - Return: expanded change set including indirectly affected specs
- [ ] **CG-DB-003**: Implement change classification
  - Classify changes by impact severity:
    - **Breaking**: changes to interfaces, data models, or contracts
    - **Non-breaking**: changes to implementation details, comments, descriptions
    - **Additive**: new specs that don't modify existing behavior
  - Classification helps determine the scope of the delta plan
- [ ] **CG-DB-004**: Implement change-to-code-file mapping
  - Map changed specs to affected code files via `spec_code_mappings`
  - Identify which generated files need to be updated
  - Identify which test files need to be re-run
  - Identify potential downstream code effects (imports, dependencies)

### 3.2 Delta Plan Generation

- [ ] **CG-DB-005**: Implement delta plan generator
  - Input: change set from change detection
  - Output: a minimal execution plan covering only the changed areas
  - Reuse plan generation logic from Agent System plan
  - Scope: only generate steps for affected specs and their immediate code files
- [ ] **CG-DB-006**: Implement delta plan optimization
  - Merge overlapping steps (two changes to the same file → one step)
  - Order by dependency (upstream changes before downstream)
  - Estimate execution time and cost for the delta plan
  - Present plan to user for approval before execution
- [ ] **CG-DB-007**: Implement delta-aware context assembly
  - For delta steps, include: the existing generated code, the changed spec content, the diff of what changed in the spec
  - Prompt: "The following spec has been updated. Update the generated code to reflect the changes."
  - Include: before and after spec content for clear diff visibility
  - Include: any related test files that may need updating

### 3.3 Delta Application

- [ ] **CG-DB-008**: Implement delta code application
  - Execute the delta plan against the existing codebase
  - Agent modifies existing files rather than regenerating from scratch
  - Preserve: human-made modifications to generated files (if any)
  - Handle: file moves, renames, and deletions
- [ ] **CG-DB-009**: Implement conflict detection with human modifications
  - Detect if humans have modified generated files since last generation
  - If modifications detected, warn the user before applying delta
  - Options: overwrite human changes, merge, skip file, abort
  - Track human modification markers in `.codegen-provenance.json`
- [ ] **CG-DB-010**: Implement incremental dependency updates
  - If the delta changes require new dependencies (npm packages)
  - Update `package.json` and run install
  - Verify compatibility with existing dependencies
  - Flag breaking dependency changes for human review

### 3.4 Regression Prevention

- [ ] **CG-DB-011**: Implement existing test verification before delta
  - Run the full test suite before applying delta changes
  - Record baseline test results (pass count, coverage)
  - After delta: compare test results to baseline
  - Flag any regressions (tests that passed before but fail after)
- [ ] **CG-DB-012**: Implement targeted test execution for delta
  - Identify tests related to the changed code files
  - Run only affected tests first (fast feedback)
  - Then run full suite (comprehensive verification)
  - Report: tests affected by delta vs. unrelated test results

---

## 4. Full Builds

### 4.1 Full Plan Generation

- [ ] **CG-FB-001**: Implement full build plan generation
  - Generate a complete execution plan from the entire knowledge graph
  - Traverse all specs in the project, ordered by dependency
  - Group into logical phases (foundation → core → features → polish)
  - Estimate total execution time and cost
  - Present to user for approval
- [ ] **CG-FB-002**: Implement project bootstrap step
  - First step in a full build: create the project skeleton
  - Generate: directory structure, package.json, configuration files, boilerplate
  - Based on project template and conventions
  - Verify: project initializes and builds successfully

### 4.2 Full Build Execution

- [ ] **CG-FB-003**: Implement sequential phase execution for full builds
  - Execute phases in order: dependencies must be met before next phase
  - Within each phase: execute steps in parallel (bounded concurrency)
  - Commit after each phase (coarser granularity for full builds)
  - Progress: report phase completion and overall percentage
- [ ] **CG-FB-004**: Implement full build checkpoint mechanism
  - Save execution state after each phase
  - If execution fails, can resume from the last successful phase
  - Checkpoint includes: committed code state, execution progress, context
  - Avoid re-executing completed phases on resume
- [ ] **CG-FB-005**: Implement full build artifact management
  - After full build completes, verify the entire generated codebase
  - Run all generated tests
  - Generate a build summary report
  - Store the final state as a tagged release in the code repository

### 4.3 From-Scratch Regeneration

- [ ] **CG-FB-006**: Implement clean regeneration flow
  - Delete existing generated code (preserve human modifications in backup)
  - Re-execute the full plan from scratch
  - Compare regenerated code with previous version
  - Report differences for review
- [ ] **CG-FB-007**: Implement regeneration comparison report
  - Diff between previous generated code and new generated code
  - Highlight: new files, removed files, modified files
  - Show line-level diffs for modified files
  - Flag unexpected differences for investigation

---

## 5. Test Verification

### 5.1 Test Execution After Steps

- [ ] **CG-TV-001**: Implement per-step test runner
  - After each plan step, run relevant tests
  - Identify relevant tests: tests in the same directory, tests that import modified files
  - Use project's test runner (bun test, jest, vitest)
  - Capture: pass count, fail count, coverage, duration
  - Store results with the step execution record
- [ ] **CG-TV-002**: Implement test failure handling per step
  - If tests fail after a step, pause execution
  - Provide failure context to the agent for auto-fix attempt
  - Agent retry: include test error messages and stack traces in context
  - Max auto-fix retries: 2 per step
  - If auto-fix fails, mark step as failed with test failure details

### 5.2 Full Test Suite Execution

- [ ] **CG-TV-003**: Implement full test suite runner after plan completion
  - Run the entire project test suite after all steps complete
  - Capture: comprehensive test results, coverage report
  - Compare coverage to thresholds (configurable: 80% statements, 70% branches)
  - Generate test report as an execution artifact
- [ ] **CG-TV-004**: Implement test suite generation verification
  - Verify that the plan generated tests (not just application code)
  - Check: test files exist for each generated module/component
  - Check: test coverage meets minimum thresholds
  - Flag modules with no tests for review
- [ ] **CG-TV-005**: Implement test result reporting to user
  - Display test results in the execution monitoring UI
  - Per-step results: inline with step progress
  - Overall results: summary panel with pass/fail counts and coverage
  - Failing tests: show error details, stack trace, related spec references
  - Link failing tests to the plan step and source specs that generated them

### 5.3 Test Quality Analysis

- [ ] **CG-TV-006**: Implement test quality metrics
  - Track: test count per module, assertion count per test, coverage depth
  - Flag: tests with no assertions (empty tests)
  - Flag: tests that always pass (trivial tests)
  - Flag: tests with hardcoded/brittle assertions
- [ ] **CG-TV-007**: Implement test-to-spec traceability
  - Map each test back to the specs it verifies
  - Verify: every spec with behavioral requirements has corresponding tests
  - Report: specs without test coverage
  - Store mapping in `.codegen-provenance.json`

---

## 6. CI/CD Integration

### 6.1 CI Pipeline Triggering

- [ ] **CG-CI-001**: Implement CI pipeline trigger after code generation
  - After code generation commits are pushed, trigger the CI pipeline
  - Use: git push webhook, GitHub Actions trigger, or API call
  - Pass context: execution ID, changed files, expected test results
  - Track CI pipeline status in the execution record
- [ ] **CG-CI-002**: Implement CI result monitoring
  - Poll or listen for CI pipeline completion
  - Capture: pass/fail status, test results, lint results, build output
  - Store CI results with the execution record
  - Notify user of CI completion (via WebSocket)
- [ ] **CG-CI-003**: Implement CI status display in execution UI
  - Show CI pipeline status alongside execution status
  - Stages: building, testing, linting, deploying
  - Per-stage status: pending, running, passed, failed
  - Link to full CI logs for debugging

### 6.2 Auto-Fix for CI Failures

- [ ] **CG-CI-004**: Implement CI failure analysis
  - Parse CI failure output to identify the failing component
  - Categorize: lint error, type error, test failure, build error, dependency error
  - Extract relevant error details (file, line, message)
- [ ] **CG-CI-005**: Implement auto-fix for lint errors
  - If CI fails due to lint errors, invoke Claude Code to fix them
  - Context: lint error messages, affected files, project lint configuration
  - Auto-fix: run linter with `--fix` flag first; invoke agent only for unfixable errors
  - Commit fixes: `[CodeGen] Fix lint errors from step {step_id}`
  - Re-trigger CI after fix
- [ ] **CG-CI-006**: Implement auto-fix for type errors
  - If CI fails due to TypeScript type errors, invoke Claude Code to fix
  - Context: type error messages, affected files, related type definitions
  - Common fixes: missing imports, wrong types, missing properties
  - Commit fixes: `[CodeGen] Fix type errors from step {step_id}`
- [ ] **CG-CI-007**: Implement auto-fix for test failures
  - If CI fails due to test failures, analyze root cause
  - Determine: is the test wrong (generated test doesn't match code) or is the code wrong?
  - If test is wrong: fix the test
  - If code is wrong: fix the code (with spec context for correct behavior)
  - Commit fixes with clear attribution
- [ ] **CG-CI-008**: Implement auto-fix retry limits
  - Max auto-fix attempts per CI failure: 3
  - If auto-fix fails after max attempts, pause execution and notify user
  - Provide: failure context, attempted fixes, remaining issues
  - User can: fix manually, adjust the plan, or abort

### 6.3 Deployment Triggering

- [ ] **CG-CI-009**: Implement staging deployment trigger
  - After CI passes, optionally deploy generated code to staging
  - Configurable: auto-deploy to staging or require manual approval
  - Track deployment status in execution record
- [ ] **CG-CI-010**: Implement production deployment trigger
  - After staging verification, deploy to production
  - Always requires manual approval for production
  - Integrates with the Deployment plan's release process
  - Track deployment status and version in execution record

---

## 7. Quality Assurance

### 7.1 Lint Verification

- [ ] **CG-QA-001**: Implement lint check after each step
  - Run ESLint (or project linter) on generated/modified files
  - Auto-fix fixable issues before committing
  - Report unfixable issues to the agent for correction
  - Zero lint errors policy: step is not complete until lint passes
- [ ] **CG-QA-002**: Implement style consistency verification
  - Verify generated code follows project conventions (naming, formatting)
  - Run Prettier on generated files
  - Check: import ordering, file organization, naming patterns
  - Report style deviations for agent correction

### 7.2 Type Checking

- [ ] **CG-QA-003**: Implement TypeScript type check after each step
  - Run `tsc --noEmit` on the target project after each step
  - Capture type errors with file, line, and message
  - If errors introduced by the current step, flag for agent auto-fix
  - Pre-existing errors are tracked but do not block the step
- [ ] **CG-QA-004**: Implement incremental type checking
  - Use TypeScript's incremental compilation for faster checks
  - Only re-check files affected by the current step
  - Cache: `tsconfig.tsbuildinfo` between steps
  - Fall back to full check if incremental check is unreliable

### 7.3 Code Review via Agent

- [ ] **CG-QA-005**: Implement agent-based code review
  - After each step, a separate agent reviews the generated code
  - Review criteria: correctness, completeness, security, performance, readability
  - Review agent has access to the source specs and the generated code
  - Review output: approval, concerns (with specific file/line references), rejection
- [ ] **CG-QA-006**: Implement review feedback loop
  - If the review agent identifies issues, feed them back to the generation agent
  - Generation agent fixes the issues and re-submits for review
  - Max review cycles: 2 per step
  - If still not approved after max cycles, flag for human review
- [ ] **CG-QA-007**: Implement human review gate (optional)
  - Configurable: require human review before proceeding past each phase
  - Present: generated code diff, agent review results, test results
  - Human can: approve, request changes, or abort
  - Human review feedback is stored for future agent learning context

### 7.4 Dependency Audit

- [ ] **CG-QA-008**: Implement dependency audit for generated code
  - Run `bun audit` (or npm audit) after dependency changes
  - Flag: critical and high vulnerability dependencies
  - Block: inclusion of known-malicious packages
  - Report: audit results as part of execution artifacts
- [ ] **CG-QA-009**: Implement dependency allow-list enforcement
  - Maintain a list of approved dependencies per project
  - If generated code introduces a new dependency not on the list
  - Require: human approval before including the dependency
  - Track: who approved which dependencies and when

---

## 8. Rollback & Recovery

### 8.1 Step-Level Rollback

- [ ] **CG-RB-001**: Implement step rollback (undo last step)
  - Revert the last committed step using `git revert`
  - Creates a new commit (preserves history)
  - Update execution state: mark step as rolled back
  - Re-run tests to verify rollback doesn't break anything
- [ ] **CG-RB-002**: Implement multi-step rollback
  - Undo the last N steps
  - Revert in reverse order (last step first)
  - Or: reset to the commit before the first step to undo (harder reset)
  - User specifies: rollback to step X (undoes all steps after X)
- [ ] **CG-RB-003**: Implement selective step rollback
  - Undo a specific step without undoing subsequent steps
  - Only possible if subsequent steps don't depend on the target step
  - Validate dependency graph before allowing selective rollback
  - If dependencies exist, warn user and offer full rollback to that point

### 8.2 Execution-Level Rollback

- [ ] **CG-RB-004**: Implement full execution rollback
  - Revert all changes made by an entire code generation execution
  - Reset the code repository to the pre-execution state
  - Options: `git revert` (preserves history) or `git reset` (clean history)
  - Delete the execution branch (if branch-per-execution strategy)
- [ ] **CG-RB-005**: Implement execution rollback with backup
  - Before rollback, archive the generated code as a backup
  - Store: git bundle or tar archive of the execution branch
  - Allow: user can restore the backup later if needed
  - Retention: keep backups for 30 days

### 8.3 Re-Execution

- [ ] **CG-RB-006**: Implement re-execution from a specific step
  - Resume execution from a specific step (after rollback or failure)
  - Validate: all preceding steps are complete and committed
  - Re-assemble context for the target step
  - Continue pipeline from that point forward
- [ ] **CG-RB-007**: Implement re-execution with modified plan
  - User modifies the plan (adjusts a step's description, adds a step)
  - Re-execute from the first modified step
  - Validate: modified plan is still valid (dependencies, references)
  - Rollback steps after the modification point, then re-execute
- [ ] **CG-RB-008**: Implement full re-execution with fresh context
  - Re-run the entire plan from scratch (new execution)
  - Useful when the knowledge graph has changed significantly
  - Optionally: start from the existing codebase (incremental) vs. clean slate

---

## 9. Execution Monitoring

### 9.1 Real-Time Status Updates

- [ ] **CG-EM-001**: Implement WebSocket-based execution status streaming
  - Server broadcasts execution events via WebSocket
  - Events: step_started, step_completed, step_failed, phase_completed, pipeline_completed
  - Each event includes: step/phase ID, timestamp, duration, status, brief description
  - Client subscribes to execution updates for a specific execution ID
- [ ] **CG-EM-002**: Implement real-time log streaming
  - Stream Claude Code's stdout/stderr in real-time via WebSocket
  - Buffer: accumulate and send every 500ms (avoid flooding)
  - Client displays: scrolling log output panel
  - Filter: show errors prominently, dim verbose output
- [ ] **CG-EM-003**: Implement execution progress calculation
  - Overall progress: steps completed / total steps (percentage)
  - Phase progress: steps completed in current phase / steps in phase
  - Estimated time remaining: based on average step duration
  - Display: progress bar with percentage and ETA

### 9.2 Step-by-Step Progress Tracking

- [ ] **CG-EM-004**: Implement execution timeline view
  - Visual timeline showing all steps and their status
  - Color-coded: green (completed), blue (running), gray (pending), red (failed), yellow (warning)
  - Duration per step displayed
  - Click on a step to view its details (context, output, logs, test results)
- [ ] **CG-EM-005**: Implement step detail view
  - Show: step description, source spec references, context summary
  - Show: generated/modified files with diff view
  - Show: agent output (what the agent "said" during execution)
  - Show: test results, lint results, type check results
  - Show: agent review feedback (if code review was performed)
- [ ] **CG-EM-006**: Implement execution summary dashboard
  - Overview: total steps, completed, failed, pending
  - Metrics: total duration, average step duration, tokens consumed
  - File metrics: files created, files modified, lines of code generated
  - Test metrics: tests generated, tests passed, coverage achieved

### 9.3 Cost & Time Tracking

- [ ] **CG-EM-007**: Implement token usage tracking per step
  - Track Claude Code API token consumption per step
  - Input tokens: context size sent to the agent
  - Output tokens: code generated by the agent
  - Cumulative: total tokens for the entire execution
  - Display: token count and estimated cost ($)
- [ ] **CG-EM-008**: Implement time tracking per step
  - Wall-clock duration per step
  - Agent processing time (excluding network latency)
  - Verification time (tests, lint, type check)
  - Idle time (waiting for dependencies)
- [ ] **CG-EM-009**: Implement execution cost estimation
  - Before execution: estimate total cost based on plan size and historical data
  - During execution: update estimate based on actual consumption
  - After execution: report final cost
  - Budget alerts: warn if execution cost exceeds user-defined threshold

### 9.4 Output Logging

- [ ] **CG-EM-010**: Implement execution log storage
  - Store complete execution logs in the database
  - Per-step logs: context, prompt, agent output, verification results
  - Pipeline logs: orchestration events, timing, errors
  - Retention: 90 days (configurable)
- [ ] **CG-EM-011**: Implement execution log export
  - Export execution logs as JSON or Markdown
  - Include: all step details, timing, cost, test results
  - Useful for: post-mortem analysis, auditing, documentation
- [ ] **CG-EM-012**: Implement execution comparison
  - Compare two executions of the same plan (or different versions)
  - Show: differences in generated code, timing, cost, test results
  - Useful for: evaluating plan changes, agent performance over time

---

## 10. Cost & Resource Management

- [ ] **CG-CM-001**: Implement per-user code generation quotas
  - Track: executions per day, total tokens per month
  - Configurable limits per user or per project
  - Warn at 80% of quota, block at 100%
  - Admin can override quotas
- [ ] **CG-CM-002**: Implement cost budgets per execution
  - User sets a maximum budget before starting execution
  - Execution pauses if cost exceeds budget
  - User can increase budget and resume, or abort
  - Default budget: configurable in project settings
- [ ] **CG-CM-003**: Implement execution scheduling
  - Queue executions when server is under load
  - Priority queue: based on user role, project priority
  - Concurrent execution limit: configurable (prevents server overload)
  - Show queue position to waiting users
- [ ] **CG-CM-004**: Implement execution resource monitoring
  - Track: CPU usage, memory usage, disk usage during execution
  - Alert: if execution consumes excessive resources
  - Kill: runaway executions that exceed resource limits
  - Log resource usage per step for capacity planning

---

## 11. Output Artifact Management

- [ ] **CG-OA-001**: Implement generated code artifact storage
  - Store final generated code as a downloadable artifact
  - Formats: git repository (clone URL), zip archive, tar.gz
  - Include: source code, tests, configuration, documentation
  - Exclude: node_modules, build output, temporary files
- [ ] **CG-OA-002**: Implement execution report generation
  - Generate a comprehensive report after each execution
  - Sections: plan summary, step results, test results, code metrics, cost summary
  - Format: Markdown (for display in UI) + PDF (for export)
  - Store as an execution artifact
- [ ] **CG-OA-003**: Implement code metrics collection
  - Lines of code generated (by language)
  - File count (by type)
  - Cyclomatic complexity
  - Dependency count
  - Test coverage percentage
  - Track metrics over time (per execution)
- [ ] **CG-OA-004**: Implement diff artifact for delta builds
  - For delta builds, generate a diff report showing what changed
  - Include: added files, modified files (with diffs), deleted files
  - Show: which specs triggered which code changes (traceability)
  - Format: Markdown diff view + downloadable patch file

---

## 12. Execution History & Analytics

### 12.1 Execution History

- [ ] **CG-EH-001**: Implement execution history storage
  - Table: `code_gen_executions` (id, project_id, user_id, plan_id, status, started_at, completed_at, total_steps, completed_steps, failed_steps, total_tokens, total_cost, execution_type)
  - Execution types: `full`, `delta`, `re-execution`, `rollback`
  - Index by project, user, status, date for fast querying
- [ ] **CG-EH-002**: Implement step history storage
  - Table: `code_gen_steps` (id, execution_id, step_id, status, started_at, completed_at, input_tokens, output_tokens, retry_count, error_message, files_created, files_modified)
  - Store: full agent prompt (compressed) and response for debugging
  - Link to: source spec IDs, generated file paths
- [ ] **CG-EH-003**: Implement execution history API
  - `GET /api/projects/:id/code-gen/executions` — list executions
  - `GET /api/projects/:id/code-gen/executions/:execId` — execution detail
  - `GET /api/projects/:id/code-gen/executions/:execId/steps` — step details
  - Filters: date range, status, execution type
  - Pagination: cursor-based, newest first
- [ ] **CG-EH-004**: Implement execution history UI
  - Timeline view of all past executions
  - Per-execution: status badge, duration, cost, step progress bar
  - Click to expand: step-by-step details, generated file diffs
  - Compare button: diff two executions
- [ ] **CG-EH-005**: Implement execution replay
  - View the step-by-step replay of a past execution
  - Show: agent prompts, responses, file changes, test results at each step
  - Useful for debugging failed executions and improving plans

### 12.2 Analytics & Reporting

- [ ] **CG-EH-006**: Implement execution analytics dashboard
  - Aggregate metrics: total executions, success rate, average duration, average cost
  - Trends: executions per week, cost per week, success rate over time
  - Breakdown: by execution type (full vs. delta), by project, by user
- [ ] **CG-EH-007**: Implement code generation quality metrics over time
  - Track: tests generated per execution, coverage achieved, lint errors per execution
  - Track: auto-fix success rate, review approval rate
  - Trend: quality improving or degrading over time
  - Flag: quality regressions for investigation
- [ ] **CG-EH-008**: Implement cost optimization recommendations
  - Analyze execution history for cost optimization opportunities
  - Recommend: smaller context windows for simple steps
  - Recommend: batching small changes into fewer delta builds
  - Recommend: plan restructuring to reduce step count
- [ ] **CG-EH-009**: Implement execution failure analysis
  - Aggregate failure reasons across executions
  - Most common failures: type errors, test failures, timeout, context too large
  - Per-spec failure rate: identify specs that frequently cause generation failures
  - Recommend: spec improvements to reduce failure rates

---

## 13. Multi-Repository Code Generation

### 13.1 Multi-Repo Configuration

- [ ] **CG-MR-001**: Implement multi-repository project configuration
  - A knowledge graph project can target multiple code repositories
  - Configuration: `project_code_repos` with repo_type (frontend, backend, shared, infrastructure)
  - Each repo has its own conventions, language, and build system
  - Plan steps specify which repo they target
- [ ] **CG-MR-002**: Implement cross-repo dependency management
  - Track dependencies between generated repositories
  - Example: frontend depends on API types generated in backend
  - Generate shared type definitions that both repos consume
  - Coordinate execution order: backend API types before frontend consumers
- [ ] **CG-MR-003**: Implement cross-repo execution orchestration
  - Execute plan steps across multiple repos in dependency order
  - Each repo has its own branch and commit strategy
  - Cross-repo verification: ensure API contracts match between repos
  - Final verification: run integration tests spanning all repos

### 13.2 Multi-Repo Verification

- [ ] **CG-MR-004**: Implement cross-repo type contract verification
  - After generating both frontend and backend
  - Verify: API types match between consumer and producer
  - Verify: shared type definitions are consistent
  - Flag: type mismatches for agent correction
- [ ] **CG-MR-005**: Implement cross-repo integration test execution
  - After all repos are generated, run integration tests
  - Tests verify: API calls between frontend and backend work
  - Tests verify: shared data structures are compatible
  - Requires: all repos built and runnable

---

## 14. Plan-Code Feedback Loop

- [ ] **CG-FL-001**: Implement code-to-spec feedback mechanism
  - If generated code reveals issues with source specs (contradictions, gaps)
  - Agent creates feedback items linked to the source specs
  - Feedback appears in the knowledge graph as inquiry items
  - User reviews and updates specs accordingly
- [ ] **CG-FL-002**: Implement spec suggestion from code patterns
  - Agent analyzes generated code for repeated patterns
  - Suggest: new specs for cross-cutting concerns discovered during generation
  - Example: "Multiple components use the same auth check pattern — suggest creating an auth guard spec"
  - Suggestions appear as proposals in the knowledge graph
- [ ] **CG-FL-003**: Implement plan improvement suggestions
  - After execution, analyze success/failure patterns
  - Suggest: step reordering for better dependency flow
  - Suggest: step splitting for steps that are too large (timeout, complex)
  - Suggest: step merging for steps that are trivially small
  - Store suggestions with the execution record for plan authors
- [ ] **CG-FL-004**: Implement execution-informed spec quality scores
  - Score specs based on how well they translate to generated code
  - Factors: generation success rate, test pass rate, auto-fix frequency
  - Low-scoring specs may need clarification or restructuring
  - Display scores in the knowledge graph UI
