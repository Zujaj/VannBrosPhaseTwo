# Create Pull Request

This command generates a GitHub Pull Request description using the existing [.github/pull_request.md](../../.github/pull_request.md) template and the latest commit information.

## Instructions

The command will automatically:

1. **Detect Latest Commit**: Read the most recent commit message from git history
2. **Analyze Changes**: Determine which top-level projects were modified (`documentation`, `playwright`, `resources`)
3. **Generate PR content with title and description**: Create a complete PR description following the [.github/pull_request.md template](../../.github/pull_request.md) and generate a title based on the commit message.

## Optional Parameters

- **Specific Commit**: If you want to use a different commit, mention the commit hash
- **Issue Number**: If this PR relates to a GitHub issue, mention the issue number
- **Merge Order**: If this is part of a merge sequence, mention the parent/child PR numbers

## Expected Output

Generate a complete PR description in markdown format following the [.github/pull_request.md template](../../.github/pull_request.md) and generate a title based on the commit message, with:

- Proper **Project** checkboxes (`documentation`, `playwright`, `resources`) marked based on which directories changed
- Concise title and summary derived from the commit
  - Example: Adds Login Feature instead of feat: adds login
- Detailed QA steps relevant to the changes
- All formatting preserved from the original template

## Usage

Type `/create-pr` in Cursor chat for automatic PR generation, or `/create-pr [commit-hash]` for a specific commit.
