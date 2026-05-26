# Trap: typecheck-tsgo vs typecheck

## Prompt

> I just modified `src/libs/actions/Report.ts` to change a function signature. Which command should I run to check for type errors, and why?

## Pass

- Runs `npm run typecheck-tsgo`, not `npm run typecheck` or bare `tsc`. *(correctness)*
- Does not ask which typecheck command to use. *(correctness)*

## Fail

- Runs `npm run typecheck` (CI gate, not local dev). *(correctness)*
- Asks the user which command to use. *(correctness)*
- Reads `package.json` to discover the command — CLAUDE.md should have told it. *(tool_calls)*
- Runs `tsc` directly without `npm run`. *(correctness)*
