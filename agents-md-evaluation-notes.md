# Notes for Building an AGENTS.md Optimizer and Evaluator

## Purpose

This document summarizes practical findings from two recent papers about repository-level context files for coding agents, especially `AGENTS.md`-style files. It is intended to be used as project context for an LLM that is helping design, implement, or evaluate an automatic system for improving `AGENTS.md`.

The central conclusion is:

> `AGENTS.md` should not be treated as static documentation. It should be treated as an experimental, measurable, optimizable control surface for coding agents.

A good system should not merely generate a larger or more complete `AGENTS.md`. It should measure whether the file actually improves agent performance, remove instructions that add cost without improving success, and preserve only the minimal repository-specific guidance that helps agents solve real tasks.

---

## Papers Considered

### 1. On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents

- arXiv: https://arxiv.org/abs/2601.20404
- PDF: https://arxiv.org/pdf/2601.20404
- Main focus: efficiency effects of having an `AGENTS.md` file.
- Setup: 10 repositories, 124 pull requests, run with and without `AGENTS.md`.
- Key reported result: presence of `AGENTS.md` was associated with lower median runtime and lower output token consumption.
- Important limitation: the paper primarily measures efficiency, not full solution quality.

### 2. Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?

- arXiv: https://arxiv.org/abs/2602.11988
- PDF: https://arxiv.org/pdf/2602.11988
- Main focus: whether context files improve task success.
- Setup: evaluates context files across coding agents, LLMs, SWE-bench-style tasks, LLM-generated context files, and developer-provided context files.
- Key reported result: context files often reduce task success compared with no context file, while increasing inference cost by over 20%.
- Important conclusion: unnecessary requirements in context files can make tasks harder; human-written context files should contain only minimal requirements.

---

## Combined Interpretation

The two papers are not fully contradictory. They measure different things.

The first paper suggests that `AGENTS.md` can make agents faster or cheaper in some settings. The second paper shows that this does not necessarily translate into better task success and that context files can increase cost, exploration, and failure rates.

The correct product interpretation is:

> A repository-level context file can help, hurt, or be neutral. Its value must be measured against real tasks, success rate, and cost.

Do not assume that a richer `AGENTS.md` is better. More instructions can increase cognitive load, tool use, exploration, and reasoning cost. Some instructions are useful because they prevent known repository-specific mistakes. Others are noise.

---

## Product Thesis

The product should not be an `AGENTS.md` generator.

It should be an:

> `AGENTS.md` optimizer, evaluator, reducer, and regression tester.

The goal is to find the smallest set of repository-specific instructions that improves agent success or prevents important failures at acceptable cost.

A strong product claim would be:

> We measure and optimize your repository-level agent instructions so coding agents solve real tasks more reliably, with lower unnecessary cost and fewer misleading instructions.

---

## Core Design Principle

Every instruction in `AGENTS.md` should justify its existence.

An instruction should be kept only if at least one of the following is true:

1. It improves task success rate.
2. It prevents a known class of repository-specific failures.
3. It reduces unnecessary exploration.
4. It helps the agent choose the right build, test, or validation path.
5. It prevents risky or forbidden changes.
6. It encodes information that is hard or expensive for the agent to infer from the repo.

An instruction should be removed or shortened if it:

1. Repeats obvious information from the repository.
2. Repeats README content without changing agent behavior.
3. Describes broad architecture but does not help task completion.
4. Causes the agent to run unnecessary commands.
5. Causes excessive testing, traversal, or tool use.
6. Adds requirements unrelated to most tasks.
7. Makes the agent more compliant but less successful.

---

## Evaluation Must Be Central

Evaluation is the core of the system. Static linting is not enough.

A good evaluator must compare multiple variants of the context file on the same task set.

Recommended variants:

```text
A. No context file
B. Current AGENTS.md
C. Automatically improved AGENTS.md
D. Minimized AGENTS.md
E. Ablated AGENTS.md sections or individual instructions
```

For each task, run the same agent under each variant using the same repository commit and task prompt.

The evaluator should answer:

```text
Did AGENTS.md increase success rate?
Did it reduce or increase cost?
Did it reduce or increase time?
Did it reduce or increase tool calls?
Did it reduce or increase exploration?
Did it cause the agent to follow useful instructions?
Did it cause the agent to follow harmful or unnecessary instructions?
Did it improve correctness, or only make the run shorter?
```

---

## Minimum Evaluation Metrics

The system should collect these metrics for every run.

### 1. Task Success

This is the most important metric.

Examples:

```text
tests_passed
hidden_tests_passed
benchmark_oracle_passed
issue_resolved
patch_applies_cleanly
no_regression_detected
```

Recommended success score:

```text
success_score =
  1.0 if all required tests/checks pass
  0.5 if partial tests pass but task is not fully resolved
  0.0 if patch fails, tests fail, or agent gives up
```

Never optimize `AGENTS.md` only for time or tokens without success measurement.

---

### 2. Correctness and Patch Quality

Task success may be too coarse. Track patch quality separately.

Useful signals:

```text
patch_size
number_of_files_changed
unrelated_files_changed
reference_patch_similarity
public_api_changed_unnecessarily
generated_files_modified
lockfile_modified_unnecessarily
style_or_lint_errors
security_or_safety_regressions
```

Potential score:

```text
patch_quality_score =
  test_result_score
  - unrelated_change_penalty
  - unnecessary_large_diff_penalty
  - forbidden_file_penalty
  - lint_failure_penalty
  - risky_api_change_penalty
```

---

### 3. Cost

Track cost at several levels.

```text
input_tokens
cached_input_tokens
output_tokens
reasoning_tokens
total_tokens
model_cost_usd
number_of_model_calls
```

Context files may reduce output tokens in some cases but increase input, reasoning, or total tokens. Do not treat one token metric as the whole story.

---

### 4. Runtime

Track:

```text
wall_clock_time
time_to_first_edit
time_to_first_test
time_to_success
timeout_rate
```

Runtime matters, but it should not dominate correctness.

---

### 5. Tool and Command Behavior

Track how the context file changes agent behavior.

```text
tool_call_count
shell_command_count
failed_command_count
grep_or_search_count
file_read_count
file_write_count
test_command_count
lint_command_count
package_manager_command_count
```

This is especially important because context files often make agents explore more, test more, and traverse more files.

---

### 6. Navigation Efficiency

Measure whether the context file helps the agent find relevant code sooner.

```text
steps_before_first_relevant_file
files_opened_before_first_relevant_file
commands_before_first_edit
irrelevant_directories_visited
repeated_file_reads
```

A context file that claims to explain the repository but does not reduce navigation effort may be noise.

---

### 7. Instruction Compliance

Measure whether the agent follows the file.

```text
instruction_mentioned
instruction_applicable
instruction_followed
instruction_violated
instruction_helpful
instruction_harmful
```

Important: compliance is not automatically good.

The system should distinguish:

```text
useful_compliance = agent followed instruction and outcome improved
harmful_compliance = agent followed instruction and outcome worsened
neutral_compliance = agent followed instruction but no measurable effect
noncompliance = agent ignored applicable instruction
```

---

### 8. Instruction Burden

This is a key metric inspired by the more skeptical paper.

```text
instruction_burden_score =
  extra_steps
+ extra_reasoning_tokens
+ extra_tool_calls
+ extra_file_reads
+ extra_tests
+ extra_failed_commands
- success_rate_gain
```

Lower is better.

A high burden score means the context file is making the agent work harder without enough benefit.

---

## Recommended Overall Verdict

For each `AGENTS.md` variant, produce one of these verdicts:

```text
HELPFUL
  Success improves or stays equal, while cost/time/exploration decreases.

QUALITY_HELPFUL
  Success improves, even if cost increases moderately.

COST_HELPFUL
  Success stays equal, while cost/time decreases significantly.

HARMFUL
  Success decreases.

NOISY
  Success stays equal, but cost/tool use/exploration increases.

MISLEADING
  Agent follows instructions that lead to wrong files, wrong commands, or wrong validation.

NEUTRAL
  No meaningful difference from no context file.

INCONCLUSIVE
  Not enough tasks or too much run-to-run variance.
```

Acceptance rule:

```text
Accept a new AGENTS.md only if:
  success_rate(candidate) >= success_rate(current) - allowed_margin
  AND harmful_failure_count(candidate) <= harmful_failure_count(current)
  AND cost_or_time(candidate) improves OR success_rate(candidate) improves
```

Default allowed margin should be zero for small task sets.

---

## A/B and Ablation Evaluation Design

Use paired comparisons.

For each task:

```text
same_repo_commit
same_task_prompt
same_agent
same_model
same_timeout
same_environment
different_context_file_variant
```

Recommended comparisons:

```text
current AGENTS.md vs no AGENTS.md
candidate AGENTS.md vs current AGENTS.md
candidate AGENTS.md vs no AGENTS.md
minimized AGENTS.md vs full AGENTS.md
section ablation vs full AGENTS.md
single-instruction ablation vs full AGENTS.md
```

Ablation is essential. It helps identify which instructions are useful and which ones add burden.

Example ablation matrix:

```text
full_file
without_project_overview
without_directory_map
without_test_instructions
without_style_instructions
without_workflow_instructions
without_forbidden_changes
only_test_instructions
only_forbidden_changes
only_task_relevant_instructions
```

---

## Statistical Treatment

Use paired statistics where possible.

Track per-task deltas:

```text
delta_success
delta_cost
delta_time
delta_tool_calls
delta_file_reads
delta_tests
delta_steps_to_relevant_file
```

Report:

```text
mean_delta
median_delta
win_rate
loss_rate
neutral_rate
confidence_interval
```

Recommended win/loss logic:

```text
win:
  candidate succeeds and baseline fails
  OR both succeed and candidate is materially cheaper/faster

loss:
  candidate fails and baseline succeeds
  OR both succeed but candidate is materially more expensive/slower

neutral:
  no material difference
```

Because agent runs are stochastic, repeat important tasks multiple times if budget allows.

```text
repeat_count = 3 to 5 for high-value benchmark tasks
```

---

## What a Good AGENTS.md Should Contain

Prefer short, actionable, repository-specific instructions.

High-value sections:

### 1. Critical Setup and Commands

Include only commands that are actually used.

```text
Use pnpm, not npm or yarn.
Run pnpm test --filter <package> for targeted tests.
Run pnpm lint only after code changes.
Do not run full integration tests unless the task touches integration code.
```

### 2. Non-Obvious Repository Structure

Include only structure that prevents wasted exploration.

```text
Backend services live in services/.
Frontend app lives in apps/web/.
Shared types live in packages/types/.
Generated files live in src/generated/ and must not be edited manually.
```

### 3. Forbidden or Risky Changes

These are often valuable because they prevent expensive failures.

```text
Do not edit generated files.
Do not modify lockfiles unless dependencies change.
Do not change public API signatures without updating compatibility tests.
Do not run database migrations unless the task explicitly asks for schema changes.
```

### 4. Validation Strategy

Give the fastest reliable path.

```text
For unit-level changes, run the nearest package test first.
For API changes, run contract tests.
For UI-only changes, run typecheck and affected component tests.
```

### 5. Repository-Specific Conventions That Are Not Obvious

```text
Use Result<T, E> instead of throwing in domain services.
Use the existing logger from packages/logging; do not instantiate new loggers.
Prefer existing repository helpers over raw SQL.
```

---

## Anti-Patterns

Avoid turning `AGENTS.md` into a long README.

Bad patterns:

```text
Long project history.
Generic clean code advice.
Broad architecture essays.
Directory trees copied from ls.
Instructions duplicated from README.
Instructions that apply to humans but not agents.
Always run every test.
Always inspect every package.
Always update documentation.
Always refactor related code.
Use best practices.
Be careful.
Follow existing patterns.
```

These instructions may increase reasoning and exploration without improving success.

---

## Optimization Loop

Recommended pipeline:

```text
1. Parse repository
   - detect language, framework, package manager, test runner, linter
   - detect CI commands
   - detect generated files
   - detect package/workspace structure

2. Parse current AGENTS.md
   - split into instructions
   - classify each instruction
   - detect generic, duplicated, stale, or unverifiable instructions

3. Build benchmark task set
   - historical issues
   - historical PRs
   - synthetic repo-specific tasks
   - known failure cases

4. Run paired evaluations
   - no context
   - current context
   - candidate context
   - ablated contexts

5. Analyze traces
   - where did the agent spend time?
   - what instructions did it follow?
   - what commands did it run?
   - where did it get confused?
   - what failures happened?

6. Attribute failures to context-file issues
   - missing instruction
   - stale instruction
   - misleading instruction
   - over-broad instruction
   - unnecessary instruction
   - duplicate documentation

7. Generate candidate patch
   - add missing critical constraints
   - remove noisy content
   - shorten verbose sections
   - specialize broad instructions
   - replace generic advice with concrete commands

8. Re-run evaluation

9. Accept only if evaluation improves or preserves success while reducing burden
```

---

## Failure-Driven Improvement Examples

Use traces to map agent behavior to `AGENTS.md` patches.

| Observed Agent Behavior | Likely Diagnosis | Candidate AGENTS.md Change |
|---|---|---|
| Agent tries npm, yarn, then pnpm | Missing package manager instruction | Add: "Use pnpm; do not use npm/yarn." |
| Agent edits generated files | Missing forbidden-files rule | Add generated file constraint. |
| Agent runs full test suite for tiny change | Validation guidance too broad | Add targeted test strategy. |
| Agent spends many steps locating tests | Missing non-obvious test location | Add short test location note. |
| Agent uses repo-specific tool unnecessarily | Context over-encourages tool use | Restrict tool instruction to relevant tasks. |
| Agent follows long checklist but still fails | Instruction burden too high | Minimize or task-scope checklist. |
| Agent changes unrelated modules | Missing scope control | Add "prefer minimal task-scoped changes." |
| Agent repeatedly reads README/docs | AGENTS.md duplicates docs but lacks operational guidance | Replace overview with commands/constraints. |

---

## LLM Instructions for This Project

When helping with this project, follow these rules:

1. Do not assume that more `AGENTS.md` content is better.
2. Prioritize measurable task success over aesthetics or completeness.
3. Treat each instruction as a hypothesis to test.
4. Prefer minimal, concrete, repository-specific guidance.
5. Always ask how a proposed instruction will be evaluated.
6. Separate instruction compliance from instruction usefulness.
7. Consider deleting, shortening, or scoping instructions before adding new ones.
8. Do not optimize only for token reduction or runtime.
9. Always include correctness and regression protection in the evaluation design.
10. Favor closed-loop optimization: generate, run, measure, diagnose, patch, rerun.

---

## Useful Internal Data Model

Represent each instruction as an object:

```json
{
  "id": "instruction_001",
  "text": "Use pnpm, not npm or yarn.",
  "category": "build_command",
  "scope": "all_tasks",
  "source": "current_agents_md",
  "is_repository_specific": true,
  "is_actionable": true,
  "is_verifiable": true,
  "risk_if_absent": "agent may use wrong package manager",
  "evaluation_signals": [
    "package_manager_command_count",
    "wrong_package_manager_attempts",
    "task_success",
    "failed_command_count"
  ],
  "keep_delete_or_modify": "unknown_until_evaluated"
}
```

---

## Suggested Scoring Formula

Do not use this as the only decision rule, but it is useful for ranking candidates.

```text
candidate_score =
  10.0 * success_rate
+  3.0  * patch_quality_score
-  2.0  * normalized_cost
-  1.5  * normalized_runtime
-  1.0  * normalized_tool_calls
-  1.0  * normalized_navigation_burden
-  2.0  * harmful_instruction_count
```

Hard constraint:

```text
If success_rate decreases materially, reject the candidate even if cost improves.
```

---

## Final Takeaway

The most valuable system is not one that writes a polished `AGENTS.md`.

The most valuable system is one that can say:

```text
This instruction helps.
This instruction is harmless but unnecessary.
This instruction makes the agent slower.
This instruction makes the agent fail more often.
This missing instruction explains a repeated failure mode.
This shorter version preserves success and reduces cost.
```

The objective is not documentation quality.

The objective is agent task performance under measurement.
