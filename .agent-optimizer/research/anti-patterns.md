# Anti-patterns

Each anti-pattern has ≥1 directive or recommendation from a primary (Anthropic) source, or ≥2 independent corroborating sources. Source references (S#) are defined in [sources.md](sources.md).

### A1: Bloated CLAUDE.md (named pattern)

- **Symptom:** File grows past ~200 lines; Claude starts ignoring rules; agents ask questions whose answers are in the file.
- **Why it's bad:**
  - S2: "Bloated CLAUDE.md files cause Claude to ignore your actual instructions!"
  - S2 (named failure pattern): "The over-specified CLAUDE.md. If your CLAUDE.md is too long, Claude ignores half of it because important rules get lost in the noise. Fix: Ruthlessly prune. If Claude already does something correctly without the instruction, delete it or convert it to a hook."
- **Implication:** This is the headline finding for our 314-line file. The audit's justification gate is designed to surface this; the rewrite's ≤200-line target operationalizes the fix.

### A2: Duplicating self-discoverable content

- **Symptom:** Lists of npm scripts, file-tree descriptions, language conventions, library API basics in the file.
- **Why it's bad:** See P3 citations. Wastes tokens, dilutes attention, drifts.
- **Implication:** The current `Command Reference`, `Entry Points` list, and most of the architectural-overview prose are expected `Cut`s. The "Onyx Keys Organization" section is a textbook example.

### A3: Contradictory rules

- **Symptom:** Two sections give different guidance for the same behavior; agent picks one arbitrarily.
- **Why it's bad:**
  - S1: "If two rules contradict each other, Claude may pick one arbitrarily. Review your CLAUDE.md files, nested CLAUDE.md files in subdirectories, and `.claude/rules/` periodically to remove outdated or conflicting instructions."
- **Implication:** The audit must flag any contradiction across the existing 314 lines (e.g. between the "Common Tasks" command list and the "Post-Edit Checklist" — currently both list typecheck commands with different framings).

### A4: Vague phrasing

- **Symptom:** "Be careful with X", "follow project conventions", "use appropriate library." No concrete subject.
- **Why it's bad:** See P5.
- **Implication:** Audit form gate flags; rewrite voice rules forbid.

### A5: Standard practices included for completeness

- **Symptom:** "Write clean code," "follow language conventions," generic ESLint reminders.
- **Why it's bad:** S2 ❌ Exclude row. Adds noise without changing behavior — the model already knows.
- **Implication:** Audit `Cut` candidates: any section that would apply identically to any TypeScript or React Native project.

### A6: File-by-file or tutorial-style prose

- **Symptom:** "src/App.tsx contains the main app component which initializes…", multi-paragraph descriptions of subsystems.
- **Why it's bad:** S2 ❌ Exclude rows ("File-by-file descriptions of the codebase"; "Long explanations or tutorials").
- **Implication:** Most of the current "Core Architecture & Structure," "Key Features & Modules," "Navigation & Routing," and "State Management" sections are expected `Cut`s or heavy `Demote`s.

### A7: Frequently-changing information

- **Symptom:** Specific module names, screen counts, action-file lists that drift every sprint.
- **Why it's bad:** S2 ❌ Exclude row. Becomes a misleading stale source; agents trust it.
- **Implication:** Audit must flag every action-module name, ONYXKEYS category, screen list — these all change. Replace with skill references or cut entirely.

### A8: API/library documentation embedded inline

- **Symptom:** Detailed prose about how Onyx works, how React Native New Architecture works, how Mapbox/Plaid integrate.
- **Why it's bad:** S2 ❌ Exclude row: "Detailed API documentation (link to docs instead)."
- **Implication:** Onyx detail belongs in the `onyx` skill (already exists). React Native New Architecture detail is either Anthropic-knowable or belongs in linked docs.
