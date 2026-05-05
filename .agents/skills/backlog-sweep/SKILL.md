---
name: backlog-sweep
description: Refresh the active backlog plan at the start of a session. Diffs git log against the plan, marks closed items, surfaces new ones, updates coverage headroom, and appends a delta block. Run when HEAD has moved since the last recorded commit in the plan.
metadata:
  owner: linkedin-engage
  tier: project
---

# Backlog Sweep

Keep `.claude/plans/backlog-linkedin-engage.md` current with what's actually on main.

## When to use

- At the start of a work session when the session-start context shows new commits since the plan was last written.
- Explicitly when asked to "refresh the backlog", "update the plan", or "what changed since last session".
- Skip if HEAD matches the commit recorded at the top of the active plan.

## Steps

1. **Find the last-recorded HEAD in the plan.**
   ```bash
   head -5 .claude/plans/backlog-linkedin-engage-2026-04-27.md
   # Look for "HEAD: <sha>" line
   ```

2. **Get the git delta.**
   ```bash
   git log --oneline <last-recorded-sha>..HEAD
   ```
   If no delta: stop — plan is current.

3. **Cross-reference with open backlog items.**
   - For each new merged PR, scan its subject against the backlog item titles.
   - Mark matching items as `CLOSED — <PR #>`.
   - Note new `feat:` / `fix:` PRs that don't map to any existing backlog item as **NEW** items.

4. **Snapshot current coverage.**
   ```bash
   npm test -- --coverage --coverageReporters=text-summary 2>&1 | grep -E "Statements|Branches|Functions|Lines"
   ```
   Record the four metrics. Flag if branches < 86.0% (warn floor).

5. **Append a delta block to the plan.**
   Format:
   ```markdown
   ## Delta since <YYYY-MM-DD> (HEAD: <sha>)

   **Closed:**
   - **CLOSED — E-11 phase N:** PR #NNN — <subject>. <one-line impact>.

   **New items:**
   - **<ID>:** <description>. `[impact: X] [effort: Y]`

   **Coverage snapshot:** <stmt> / <branch> / <fn> / <lines> (branch headroom: <X>pp over 85.7%)

   **HEAD:** <new-sha>. **Version:** <package.json version>.
   ```

6. **Update the top-10 table** if any items were closed or new high-value items were added.

7. **Update the HEAD line** at the top of the plan to the new SHA.

## Skip conditions

- HEAD unchanged from the plan's recorded SHA.
- The delta is only release-bump commits (`chore(release): bump version`) with no functional changes — record the new SHA but skip the item analysis.

## Output

Updated `.claude/plans/backlog-linkedin-engage-<date>.md` (or the most recent dated file) with a new delta block appended. Report a one-line summary: "X items closed, Y new, branch at Z%."

## Failure path

If `npm test -- --coverage` takes >2 minutes or fails, skip step 4 and note "coverage not refreshed" in the delta block.
