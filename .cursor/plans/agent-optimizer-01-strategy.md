<!--
  Historical plan document (Plan 1 — research strategy). File paths inside
  this plan reference the original .cursor/plans/ layout; deliverables have
  since been moved into .agent-optimizer/.
-->

---
name: CLAUDE.md improvement — research phase
overview: "Research-only plan: gather authoritative best practices for CLAUDE.md and validate or refute working hypotheses about its right shape for this repo. Output is a structured research artifact that becomes the sole input to a separate Plan 2 (audit, rewrite, evaluate, validate)."
todos:
  - id: research-anthropic
    content: Fetch Anthropic primary sources (Claude Code memory docs, best-practices guide, engineering posts) and extract verbatim guidance about CLAUDE.md content, structure, and anti-patterns
    status: completed
  - id: research-cursor
    content: Fetch Cursor primary sources covering AGENTS.md/CLAUDE.md reader behavior; answer the compatibility questions in this plan
    status: completed
  - id: research-community
    content: Survey 2–3 high-signal community sources (well-maintained OSS CLAUDE.md examples, reputable engineering blogs); extract any claims with measurable backing
    status: completed
  - id: research-internal
    content: Inventory .claude/skills/, .claude/commands/, .claude/agents/, .cursor/ to map what's already covered elsewhere and where CLAUDE.md content could be demoted
    status: completed
  - id: research-hypotheses
    content: Classify each working hypothesis from this plan as confirmed / refuted / uncertain, with citation per verdict. Anything uncertain after research is flagged for eval-only validation in Plan 2
    status: pending
  - id: research-deliverable
    content: "Produce .cursor/plans/claude_md_research.md with the schema defined in this plan: principles, anti-patterns, hypothesis verdicts, recommended rubric dimensions, recommended success metrics, open questions, and a recommendation for Plan 2's shape"
    status: completed
  - id: create-plan-2
    content: After research deliverable is reviewed by user, create Plan 2 (audit + rewrite + evaluate + validate). This plan does NOT cover Plan 2 contents — Plan 2 is built from the research deliverable, not from pre-committed principles.
    status: completed
isProject: false
---

# CLAUDE.md Improvement — Research Phase

## Overview

Research-only plan. The single deliverable is a structured artifact at `.cursor/plans/claude_md_research.md` that any subsequent plan can use as its source of truth for principles, anti-patterns, rubric dimensions, and success metrics. **No audit, no rewrite, no eval harness in this plan** — those are built in Plan 2, *from* the research output, not in parallel with it.

## Why split research out

Earlier drafts of this plan pre-committed to specific gates, rubric dimensions, voice rules, and success thresholds before the research that would justify them existed. That's the "ready, fire, aim" trap: the research phase becomes a hunt for citations that support already-made decisions, and any source that contradicts the pre-committed structure gets unconsciously discounted.

Splitting research into its own plan with a structured deliverable means Plan 2 is built mechanically *from* the research findings — every gate, dimension, and threshold in Plan 2 either cites a source from this phase or is explicitly marked "no source found; validated empirically by eval."

## Decisions locked from prior discussion (in force; not subject to research)

These are joint decisions between user and assistant, not assertions to be researched. They constrain Plan 2 but are out of scope for this phase.

- **Rigor:** Plan 2 will use a strict before/after behavioral eval; ship only on measurable win.
- **Scope:** Aggressive content remake of `CLAUDE.md`, but the file stays a **single self-contained markdown file**. No `@import` splitting.
- **Ecosystem stance:** Invest in the Claude ecosystem (`CLAUDE.md` + `.claude/skills/`). Do not parallel-maintain `.cursor/rules/*.mdc` infrastructure.
- **Compatibility:** `CLAUDE.md` must remain readable and correctly actionable by any harness (Cursor, Codex, future tools), not only Claude Code. Compatibility is enforced by content choices in `CLAUDE.md` itself, not by parallel files for other tools.

## Working hypotheses to validate in this phase

These are the assertions I previously slipped into the plan as principles. Each gets classified during research as **Confirmed** (primary source quoted), **Refuted** (primary source contradicts), or **Uncertain** (no authoritative source; defer to Plan 2 eval for empirical validation).

| # | Hypothesis | Why it matters for Plan 2 |
|---|---|---|
| H1 | `CLAUDE.md` should be written as a prompt (imperative, action-oriented) rather than narrative documentation. | Drives Plan 2's voice rules and the audit's form gate. |
| H2 | `CLAUDE.md` should lead with the things agents most commonly get wrong in this repo. | Drives Plan 2's structural shape. |
| H3 | Content that is "self-discoverable" (findable in `package.json`, the file tree, or one `Read` away) should be cut from `CLAUDE.md`. | Drives the audit's justification gate; controls expected `Cut` count. |
| H4 | Long-context degradation / context pollution measurably hurts agent performance, so token budget is a real constraint. | Drives the "token cost ≤ baseline" success criterion. |
| H5 | Demoting detail into skills helps Claude Code but is invisible to other harnesses unless `CLAUDE.md` names the skill by file path. | Drives the "name + path" reference rule in Plan 2. |
| H6 | Behavioral evals with curated tasks are a better validator of `CLAUDE.md` quality than human review or LLM-as-judge alone. | Drives Plan 2's eval harness design and grading approach. |
| H7 | Specific rubric dimensions worth measuring include: correct commands chosen, known traps avoided, files touched (precision/recall), redundant exploration count, post-edit-checklist compliance, clarifying-question count, hallucinated paths/commands. | Drives Plan 2's rubric. |
| H8 | A `+15%` aggregate improvement with no per-task regressions is the right ship threshold. | Drives Plan 2's success criteria. |

Hypotheses with no authoritative source after Phase research are **not killed** — they are flagged as "uncertain, validate via Plan 2 eval-only." That's the honest path: we either cite or we measure, never assert.

## Research scope & sources

### Anthropic (highest weight — they own the spec)

- Claude Code memory docs: `https://docs.anthropic.com/en/docs/claude-code/memory`
- Claude Code best-practices guide: `https://docs.anthropic.com/en/docs/claude-code/best-practices`
- "Claude Code: Best practices for agentic coding" (engineering post): `https://www.anthropic.com/engineering/claude-code-best-practices`
- Prompt engineering guide: `https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview`
- Long-context guidance (relevant to H4): `https://docs.anthropic.com/en/docs/build-with-claude/long-context-tips`

### Cursor (compatibility check only)

- Cursor `AGENTS.md` docs: `https://docs.cursor.com/`
- Compatibility questions to answer:
  - Does Cursor cleanly read `CLAUDE.md` via the [AGENTS.md](AGENTS.md) redirect?
  - Does it choke on any plain-markdown construct we might use (deeply nested lists, long code fences, tables)?
  - When `CLAUDE.md` mentions ``see `.claude/skills/onyx/SKILL.md` ``, will a Cursor agent open it? (Behavioral question — recorded as a Plan 2 eval task, not researched.)

### Community (sample 2–3; prefer engineering blogs over listicles)

- 1–2 well-maintained OSS repo `CLAUDE.md` files (Anthropic's own examples on GitHub, plus a large React Native repo if available).
- 1–2 reputable engineering write-ups on running coding agents in production.
- Filter: a community source counts only if it makes a *specific* claim with reasoning we can evaluate, not vague advice.

### Internal

- Inventory `.claude/skills/`, `.claude/commands/`, `.claude/agents/`, `.cursor/` — already partly done in this conversation (zero `.mdc` files; 7 skills exist). The goal is to map what's already covered elsewhere so the audit's "Demote" candidates have known targets.
- Past `agent-transcripts/` review is **explicitly skipped** per user direction (not worth the effort for this scope).

## Procedure (execute in this exact order)

**Step 1 — Fetch and store sources.** For each source URL above, fetch full text. Save raw fetched content alongside the deliverable so future researchers can audit our citations. If a fetch is blocked (sandbox / network), record it and either request `full_network` permission or fall back to user-provided local copies.

**Step 2 — Extract claims per source.** For each source, produce a list of atomic claims with:
- Claim text (one sentence, paraphrased).
- Verbatim quote backing it.
- Source URL + locator (section heading or paragraph).
- Strength: `directive` (e.g. "do not X"), `recommendation` (e.g. "prefer Y"), `observation` (e.g. "we've seen X cause Y").

**Step 3 — Synthesize principles and anti-patterns.** Group claims across sources by topic. A principle is promoted to the deliverable only if:
- It has ≥1 directive or recommendation from a primary (Anthropic) source, OR
- It has ≥2 independent corroborating sources (any tier).

Anti-patterns same treatment, but phrased as "do not X" with cited rationale.

**Step 4 — Classify working hypotheses.** Walk the H1–H8 table. For each hypothesis:
- If sources directly confirm → **Confirmed**, cite the strongest source.
- If sources directly contradict → **Refuted**, cite the source and revise Plan 2's expected shape.
- If sources are silent or split → **Uncertain**, flagged for eval-only validation in Plan 2.

**Step 5 — Recommend Plan 2 inputs.** From principles + hypothesis verdicts, draft recommendations for:
- Voice / form rules for the rewrite (from H1, H2, related principles).
- Audit gates and their exact wording (from H3 and related principles, only if confirmed).
- Eval rubric dimensions (from H7, only the confirmed ones; uncertain ones may still be included with a "experimental" flag).
- Success thresholds (from H8; if uncertain, recommend "establish baseline first, set threshold from observed variance").
- Compatibility / portability rules (from Cursor research and H5).

**Step 6 — Write deliverable.** Single file `.cursor/plans/claude_md_research.md` with the schema below.

### Execution model

Step 1 (fetches) is parallelizable — run all WebFetches in one batch. Step 2 (claim extraction) is parallelizable per source — dispatch to `explore` subagents, one per source, returning structured claim lists. Steps 3–6 are sequential and run by the parent agent.

## Deliverable schema

`.cursor/plans/claude_md_research.md` must contain these sections in order:

```
# CLAUDE.md Research Findings

## Sources consulted
<table: source | URL | tier (Anthropic / Cursor / community / internal) | fetch date | notes>

## Principles (cited)
### P1: <name>
- Claim: <imperative one-liner>
- Source(s): <URL + verbatim quote>
- Implication for Plan 2: <what gate/rule/dimension this enables>

[... P2, P3, ...]

## Anti-patterns (cited)
### A1: <name>
- Symptom: <what it looks like in a CLAUDE.md>
- Why it's bad: <verbatim quote + URL>
- Implication for Plan 2: <what audit signal flags this>

[... A2, A3, ...]

## Working hypothesis verdicts
<table: H# | hypothesis | verdict (Confirmed / Refuted / Uncertain) | strongest source | note>

## Recommended Plan 2 inputs

### Voice / form rules for the rewrite
### Audit gates and exact wording
### Eval rubric dimensions (with experimental flags for uncertain ones)
### Recommended success thresholds (or "establish from baseline")
### Compatibility / portability rules for cross-harness readability

## Open questions for human reviewer
<bulleted list — anything that requires user judgment before Plan 2 can be drafted>

## Suggested shape of Plan 2
<short paragraph describing the recommended structure; not a draft of Plan 2 itself>
```

The deliverable is intentionally rigid: Plan 2's author (human or agent) should be able to produce a complete Plan 2 by mechanically translating the "Recommended Plan 2 inputs" section, with no need to re-derive anything.

## Explicitly out of scope (for Plan 2)

- Auditing the current [CLAUDE.md](CLAUDE.md) section-by-section.
- Building the eval harness or `evals/claude-md/` directory.
- Writing any version of the new `CLAUDE.md`.
- Cross-harness validation runs.
- Any CI drift checks or institutionalization tooling.

If during research it becomes clear one of these has to be touched (e.g. we discover a Cursor parser bug that requires immediate documentation), it gets recorded as an "Open question for human reviewer" — not snuck into this plan.

## Risks & mitigations

- **Web sources unreachable in sandbox** — first attempt at fetches in this conversation was interrupted. Mitigation: request `full_network` permission for Step 1; if still blocked, ask user to download key Anthropic pages and provide local copies.
- **Sources contradict locked decisions** — e.g. Anthropic explicitly recommending `@import` splitting. Mitigation: research records the contradiction in the deliverable and flags it as an Open question; user decides whether to revisit the locked decision before Plan 2 is drafted.
- **All hypotheses end up "Uncertain"** — research finds nothing definitive. Mitigation: this is acceptable. Plan 2 just leans more heavily on eval-driven validation; the deliverable's "Recommended success thresholds" section explicitly says "establish from baseline."
- **Citation laundering** — using research to support already-made decisions rather than test them. Mitigation: Step 4 classifies *every* hypothesis on its own merits and records the verdict before Step 5 (recommendations) starts. Reviewer can audit Step 4 in isolation.

## Pre-flight answers from user (Step 1 inputs)

- **Network:** `full_network` permission granted for Step 1 WebFetch calls.
- **Community sources:** assistant's discretion to pick 2–3 high-signal sources.
- **Transcript spot-check:** explicitly skipped.
