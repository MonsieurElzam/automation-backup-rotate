## What it's for

One backup a day, kept forever, ends up filling the disk; deleting by hand risks erasing the wrong one. This script applies a clear policy: keep the **last N**, **one per week** and **one per month**, and offers to delete the rest.

## Before you start

- A backup folder whose file names contain the date (`db-2026-10-26.enc`) — otherwise the file's modification date is used.
- A file-name pattern (`.enc`, `.sql.gz`) so only your backups are targeted.

## Step by step

1. **Simulate first** (nothing is deleted):
   ```bash
   node src/backup-rotate.mjs /var/backups --pattern .enc --daily 7 --weekly 4 --monthly 6
   ```
2. Review the list: `= garde` (keep) and `- supprimerait` (would delete).
3. When it suits you, add `--apply`: files outside the policy are **permanently deleted**.

## Reading the output

Each kept file shows why (`récente`, `hebdomadaire`, `mensuelle` — recent, weekly, monthly). The oldest backup of each week and each month in the window is kept.

## Automating it

After the nightly backup, as a scheduled job. Always keep an **off-site** copy: local rotation does not protect against fire or theft.

## Pitfalls

- `--apply` requires `--pattern`: without a pattern, every file in the folder would be affected.
- Test **restoring** a backup from time to time: a backup never restored is a hypothesis.
