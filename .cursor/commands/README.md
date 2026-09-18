# Cursor Commands

AI command templates for the **VannBrosPhaseTwo** monorepo (QA + documentation workspace).
See `.cursor/rules/project.mdc` for repository structure and conventions.

## Commands

### `/create-pr`

Generate a GitHub Pull Request title and description from the latest commit (or a
specified commit hash).

**Usage:** `/create-pr` or `/create-pr [commit-hash]`

### `/create-issue`

Generate a GitHub issue (bug report or feature request) from commit/PR information.

**Usage:** `/create-issue` or `/create-issue [commit-hash]`

## Notes

- These commands read git history and generate markdown output following any templates
  under `.github/`.
- For test and documentation work, prefer the project skills (`vannbrosphasetwo-knowledge`,
  `vannbrosphasetwo-playwright`, `vannbrosphasetwo-docs`, `vannbrosphasetwo-test-cases`).
