# Lookup: mobile build origin

## Prompt

> I cloned the Expensify App repo for the first time. What directory do I run mobile builds from, and why?

## Pass

- Names the **App repo root** as the build directory. *(correctness)*
- Mentions `git submodule update --init` before building. *(correctness)*
- No file exploration — answer comes directly from CLAUDE.md. *(tool_calls: 0)*

## Fail

- Says `App/Mobile-Expensify/` as the build directory — `App/` is the conventional clone directory name, not a subdirectory; from within the repo the submodule is always at `Mobile-Expensify/`. *(correctness)*
- Says to `cd Mobile-Expensify/` before running `npm run ios` / `npm run android`. *(correctness)*
- Asks "which mobile target?" — iOS and Android use the same answer. *(correctness)*
