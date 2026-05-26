# <Title>

## Prompt

> Verbatim prompt the agent receives. Must be self-contained — no context beyond what
> CLAUDE.md provides. Use backticks for file paths and commands.

## Pass

- Concrete thing the agent must do or say. *(correctness)*
- Add one bullet per distinct required behavior.
- Annotate with the metric it tests: *(correctness)*, *(tool_calls)*

## Fail

- Specific wrong answer or behavior. *(correctness)* or *(tool_calls)*
- Add one bullet per distinct failure mode.
