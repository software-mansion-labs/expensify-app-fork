# Principles

Each principle has ≥1 directive or recommendation from a primary (Anthropic) source, or ≥2 independent corroborating sources. Source references (S#) are defined in [sources.md](sources.md).

### P1: Treat CLAUDE.md as a prompt, not documentation

- **Claim:** CLAUDE.md is delivered as a user message at session start; how it's written directly shapes adherence. Imperative, action-oriented, specific instructions outperform narrative prose.
- **Source(s):**
  - S1: "CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance, especially for vague or conflicting instructions."
  - S1: "Specific, concise, well-structured instructions work best."
  - S2: "Treat CLAUDE.md like code: review it when things go wrong, prune it regularly, and test changes by observing whether Claude's behavior actually shifts."
- **Implication:** Voice rule for the rewrite — imperative mood, do/don't structure. The audit's form gate flags narrative paragraphs.

### P2: Add to CLAUDE.md what you'd otherwise re-explain

- **Claim:** The criterion for "should this be in CLAUDE.md?" is whether the absence causes you (or a new teammate) to re-explain it. Specifically: when Claude makes the same mistake twice, when code review catches something it should have known, when you type the same correction repeatedly.
- **Source(s):**
  - S1: "Treat CLAUDE.md as the place you write down what you'd otherwise re-explain. Add to it when: Claude makes the same mistake a second time; A code review catches something Claude should have known about this codebase; You type the same correction or clarification into chat that you typed last session; A new teammate would need the same context to be productive."
- **Implication:** The rewrite's top section should be the "what almost always goes wrong here" block. The audit's justification gate is grounded in this criterion.

### P3: Cut anything self-discoverable from the codebase

- **Claim:** Content the agent can find by reading code, `package.json`, or the file tree should not be in CLAUDE.md. The cost is twofold: it consumes tokens and dilutes attention from the rules that matter.
- **Source(s):**
  - S2 (the ✅/❌ table — verbatim):
    - ❌ Exclude: "Anything Claude can figure out by reading code"
    - ❌ Exclude: "Standard language conventions Claude already knows"
    - ❌ Exclude: "Detailed API documentation (link to docs instead)"
    - ❌ Exclude: "Information that changes frequently"
    - ❌ Exclude: "File-by-file descriptions of the codebase"
    - ❌ Exclude: "Self-evident practices like 'write clean code'"
  - S2: "Keep it concise. For each line, ask: 'Would removing this cause Claude to make mistakes?' If not, cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions!"
- **Implication:** This is the **canonical citation** that closes the package.json-command-list discussion. The audit's justification gate is directly Anthropic-recommended. The rewrite's expected cut list (generic `npm install`, `npm run lint`, etc.) has explicit primary-source backing.

### P4: Length is a real constraint — target under 200 lines

- **Claim:** Long-context performance degradation isn't theoretical for CLAUDE.md. Anthropic gives a concrete numeric target: under 200 lines per file. Beyond that, adherence measurably drops.
- **Source(s):**
  - S1: "Size: target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence."
  - S1 (troubleshooting): "Files over 200 lines consume more context and may reduce adherence."
  - S2: "Most best practices are based on one constraint: Claude's context window fills up fast, and performance degrades as it fills."
  - S2: "If your CLAUDE.md is too long, Claude ignores half of it because important rules get lost in the noise."
  - S7 (community corroboration): "Shorter than you think. Files under 200 lines that are actively maintained outperform 800-line files that drift out of date."
- **Implication:** Concrete success threshold. Current `CLAUDE.md` at 314 lines is **57% over budget** and beyond the documented adherence cliff. The rewrite target is ≤200 lines.

### P5: Each instruction must be specific enough to verify

- **Claim:** Vague instructions silently fail. Specificity is what separates an instruction Claude follows from one it interprets liberally.
- **Source(s):**
  - S1: ` "Use 2-space indentation" instead of "Format code properly"; "Run \`npm test\` before committing" instead of "Test your changes"; "API handlers live in \`src/api/handlers/\`" instead of "Keep files organized."`
  - S1: "Make instructions more specific. 'Use 2-space indentation' works better than 'format code nicely.'"
- **Implication:** The audit's form gate flags vague language. The rewrite's voice rules require concrete subjects (file paths, command names, version numbers) — no "be careful with X" or "follow project conventions."

### P6: Skills and rules are the right home for on-demand or scoped content

- **Claim:** Multi-step procedures, domain knowledge that's only relevant sometimes, and path-specific guidance should live in skills (loaded on demand) or `.claude/rules/` (with `paths` frontmatter for path-scoping), not in CLAUDE.md.
- **Source(s):**
  - S1: "If an entry is a multi-step procedure or only matters for one part of the codebase, move it to a skill or a path-scoped rule instead."
  - S2: "CLAUDE.md is loaded every session, so only include things that apply broadly. For domain knowledge or workflows that are only relevant sometimes, use skills instead. Claude loads them on demand without bloating every conversation."
  - S1: "For larger projects, you can organize instructions into multiple files using the `.claude/rules/` directory... Rules can also be scoped to specific file paths, so they only load into context when Claude works with matching files, reducing noise and saving context space."
- **Implication:** The audit's `Demote` tag has two distinct targets — `.claude/skills/<name>/SKILL.md` and `.claude/rules/<topic>.md` with optional `paths` frontmatter.

### P7: Use emphasis sparingly to reinforce critical rules

- **Claim:** Adding "IMPORTANT" or "YOU MUST" to a rule measurably improves adherence — when used selectively. Overuse defeats it.
- **Source(s):**
  - S2: "You can tune instructions by adding emphasis (e.g., 'IMPORTANT' or 'YOU MUST') to improve adherence."
- **Implication:** The rewrite can use IMPORTANT/MUST markers, but the audit's form gate should also flag overuse (every paragraph IMPORTANT = no paragraph is). Cap: 5 markers in the whole file.

### P8: HTML comments are a free annotation channel

- **Claim:** Block-level HTML comments (`<!-- ... -->`) are stripped before CLAUDE.md is injected into context. They cost nothing and are visible to humans reading the file.
- **Source(s):**
  - S1: "Block-level HTML comments in CLAUDE.md files are stripped before the content is injected into Claude's context. Use them to leave notes for human maintainers without spending context tokens on them."
- **Implication:** Rewrite can add per-section provenance comments without any token cost. Useful for justifying choices to future human reviewers.

### P9: Prefer positive examples to negative instructions

- **Claim:** Showing what good behavior looks like outperforms telling the model what not to do — at least for tone/style adherence.
- **Source(s):**
  - S5: "Positive examples showing how Claude can communicate with the appropriate level of concision tend to be more effective than negative examples or instructions that tell the model what not to do."
- **Note:** Community source S8 weakly contradicts this — "What NOT to do (negative instructions work surprisingly well)" — but offers no evidence. We weight the primary source. Mixed do/don't tables (Anthropic's own preferred format in S2) appear to be a workable compromise.
- **Implication:** The rewrite uses do/don't tables (matches Anthropic's own format) but leans toward positive framing in single-sentence rules.

### P10: AGENTS.md is the multi-tool canonical file; CLAUDE.md complements it

- **Claim:** Per Anthropic's *own* documentation, when an `AGENTS.md` already exists, the recommended pattern is `CLAUDE.md` containing `@AGENTS.md` (or a symlink), with Claude-specific additions appended.
- **Source(s):**
  - S1: "Claude Code reads CLAUDE.md, not AGENTS.md. If your repository already uses AGENTS.md for other coding agents, create a CLAUDE.md that imports it so both tools read the same instructions without duplicating them... A symlink also works if you don't need to add Claude-specific content."
  - S7: "Recommended pattern: Put shared rules in AGENTS.md (architecture, build commands, conventions), then use tool-specific files like `.cursor/rules/` or `CLAUDE.md` only for tool-specific features."
  - S8: "AGENTS.md is the closest thing we have to a universal standard... stewarded by the Linux Foundation's Agentic AI Foundation. Recommended pattern: shared rules in AGENTS.md, Claude-specific additions in CLAUDE.md."
- **Implication:** Major tension with the locked decision. The current repo state (`AGENTS.md` is a one-line redirect to `CLAUDE.md`) is the **inverse** of what every primary and community source recommends. Acknowledged and accepted per Q1 → Path A (see [sources.md](sources.md)).
