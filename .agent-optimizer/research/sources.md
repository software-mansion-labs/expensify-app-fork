# Research Sources

## Sources consulted

| # | Source | URL | Tier | Status |
|---|---|---|---|---|
| S1 | Claude Code — How Claude remembers your project (memory docs) | https://docs.anthropic.com/en/docs/claude-code/memory | Anthropic | Fetched in full (442 lines) |
| S2 | Claude Code — Best practices | https://docs.anthropic.com/en/docs/claude-code/best-practices | Anthropic | Fetched in full (551 lines) |
| S3 | Anthropic Engineering — Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices | Anthropic | Fetched; identical content to S2 (same canonical text). Treated as one source. |
| S4 | Prompt engineering — overview | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview | Anthropic | Fetched (short pointer page) |
| S5 | Prompt engineering — long-context tips & model-tuning guidance | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips | Anthropic | Fetched in full (900 lines) |
| S6 | Cursor docs (Rules, Agent overview) | https://docs.cursor.com/en/context/rules, https://docs.cursor.com/agent/overview | Cursor | Direct WebFetch returned near-empty (client-rendered SPA). Relied on community summaries (S7, S8) for compatibility claims. Limitation acknowledged. |
| S7 | The Prompt Shelf — "Cursor Rules vs CLAUDE.md vs AGENTS.md: Which to Pick (2026 Guide)" | https://thepromptshelf.dev/blog/cursorrules-vs-claude-md/ | Community | Fetched in full; specific claims with reasoning |
| S8 | Save Markdown — ".cursorrules vs CLAUDE.md vs AGENTS.md" | https://savemarkdown.co/blog/cursorrules-vs-claude-md-vs-agents-md | Community | Fetched in full; specific claims with reasoning |
| S9 | Internal — `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `.cursor/`, `AGENTS.md` | local | Internal | Inventoried this session |

**Source-tier limitation:** Cursor primary docs could not be fetched cleanly (client-rendered). Compatibility claims about Cursor reading `AGENTS.md` rest on the community sources S7 and S8 (which mutually corroborate). This is the weakest link in this research; flagged as Open Question Q3.

## Working hypothesis verdicts

| # | Hypothesis | Verdict | Strongest source | Note |
|---|---|---|---|---|
| H1 | Write CLAUDE.md as a prompt (imperative, action-oriented), not narrative documentation. | **Confirmed** | S1 + S2 (see P1) | Anthropic explicitly frames it as a prompt delivered as a user message. |
| H2 | Lead with what agents most commonly get wrong in this repo. | **Confirmed** | S1 (see P2) | Verbatim Anthropic criterion: "things you'd otherwise re-explain." |
| H3 | Cut content that is self-discoverable (in `package.json`, file tree, one `Read` away). | **Confirmed** | S2 (see P3) | Anthropic's ❌ Exclude table is a near-verbatim match for the audit's justification gate. |
| H4 | Long-context degradation is real; token budget is a hard constraint. | **Confirmed** | S1 + S2 (see P4) | Concrete numeric target documented: under 200 lines. Our file is 314 lines. |
| H5 | Demoting to skills helps Claude Code but is invisible to other harnesses unless `CLAUDE.md` names the skill by file path. | **Confirmed (with revision)** | S1 + S7 + S8 | Confirmed mechanism. Revision: skills *and* `.claude/rules/` are options. For multi-tool portability, AGENTS.md → CLAUDE.md is the recommended split (P10) — which conflicts with our locked single-file decision. See Q1. |
| H6 | Behavioral evals beat human review or LLM-judge alone for validating CLAUDE.md quality. | **Partially Confirmed** | S2 | Anthropic: "test changes by observing whether Claude's behavior actually shifts." Behavioral testing is endorsed; specific design (curated tasks, blind grading) is unsourced — sound but not authoritative. |
| H7 | The specific rubric dimensions listed in the plan (correct commands, traps avoided, files touched precision/recall, redundant exploration count, post-edit-checklist compliance, clarifying-question count, hallucinated paths). | **Uncertain** | — | No primary source enumerates rubric dimensions for CLAUDE.md eval. Defer to eval-only validation; treat individual dimensions as hypotheses to refine after pilot. |
| H8 | A `+15%` aggregate improvement with no per-task regressions is the right ship threshold. | **Uncertain → Refuted as specified** | — | No primary source recommends a specific threshold. Setting a number before establishing baseline variance is unprincipled. Compute baseline variance first, then set threshold (e.g. "improvement exceeds 2σ on aggregate" or similar). |

## Decisions logged from user review

- **Q1 → Path A.** CLAUDE.md remains the canonical single self-contained file; AGENTS.md continues to redirect. The documented tension with P10 is acknowledged: every consulted source recommends the inverse pattern. We accept the trade-off in exchange for simpler maintenance and a single file all readers must consume.
- **Q2 → ≤200 lines (strict).** Hard cap matching Anthropic's documented adherence cliff (P4). Current file is 314 lines → minimum **36% reduction** required. The CI drift check enforces this as a build-time guard.
- **Q3 → ignore Cursor docs going forward.** Cursor's primary docs are not fetchable and not worth a probe step. Cross-harness portability continues to be enforced at the *content* level (plain markdown, no Claude-Code-only syntax in `CLAUDE.md`, explicit skill paths) — not at the parser level.
