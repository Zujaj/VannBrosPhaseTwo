# Create GitHub Issue

This command generates a GitHub issue description using the existing [.github/ISSUE_TEMPLATE/bug_report.md](../../.github/ISSUE_TEMPLATE/bug_report.md) template and commit/PR information.

## Instructions

The command will automatically:

1. **Detect Latest Commit**: Read the most recent commit message from git history
2. **Analyze Changes**: Determine which top-level projects were modified (`documentation`, `playwright`, `resources`)
3. **Generate Issue content with title and description**: Create a complete issue description following the [bug_report.md](../../.github/ISSUE_TEMPLATE/bug_report.md) template and generate a title based on the commit message.
4. **Forecast Content**: Generate realistic issue content based on the commit/PR changes

## Optional Parameters

- **Specific Commit**: If you want to use a different commit, mention the commit hash
- **PR Content**: Provide PR description content to generate a corresponding issue

## Expected Output

Generate a complete issue description in markdown format following the [bug_report.md](../../.github/ISSUE_TEMPLATE/bug_report.md) template and generate a title based on the commit message, with:

- The template's sections filled: **Describe the bug**, **To Reproduce**, **Expected behavior**, **Screenshots**, **Desktop/Smartphone** environment, **Additional context**
- Concise title using present-tense action verbs (Fix, Resolve, Correct, etc.)
- Detailed description that forecasts what the original issue would have contained
- Proper formatting preserved from the original template
- Reproduction steps mapped to the VannBrosPhaseTwo QA env where relevant (`https://agrierp-vann-qa.folio3.site`, VBS tenant)

## Usage

Type `/create-issue` in Cursor chat for automatic issue generation from the latest commit, or `/create-issue [commit-hash]` for a specific commit. You can also provide PR content directly for issue generation.

> Note: Only a **bug report** template currently exists under `.github/ISSUE_TEMPLATE/`. Add a `feature_request` template there and update this command if feature issues are needed.
