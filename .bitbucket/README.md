# Bitbucket templates

Bitbucket Cloud does not read template files from the repo, so these are the source copies.

| File | Where it goes |
| --- | --- |
| [`pull_request.md`](pull_request.md) | Repository settings > Pull requests > **Default description**. Paste it there; update both when it changes. |
| [`ado_bug_report.md`](ado_bug_report.md) | Draft for filing a bug in Azure DevOps (`dev.azure.com/AgriERPProduct/Vann Brothers`). Bugs are tracked in ADO, not Bitbucket issues. |
| [`bug_report.md`](bug_report.md) | Generic bug report outline, used by the `.cursor/commands/create-issue.md` command. |

CI lives in [`bitbucket-pipelines.yml`](../bitbucket-pipelines.yml) at the repo root.
