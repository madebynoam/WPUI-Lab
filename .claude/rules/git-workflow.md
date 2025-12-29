# Git Workflow Rules

This file guides Claude on helping maintain clean, professional git practices while accommodating an iterative development style.

## Core Philosophy

**Messy → Clean**: It's OK to work messy in feature branches. Cleanup happens before merging to main.

## Branch Naming Conventions

Always suggest descriptive branch names using these prefixes:

- `feature/{description}` - Focused features (one feature per branch)
  - Example: `feature/grid-column-positioning`, `feature/sticky-drag-mode`
- `spike/{description}` - Experimental branches (throwaway, delete after testing)
  - Example: `spike/test-threshold-fix`, `spike/try-different-algorithm`
- `bugfix/{description}` - Specific bug fixes
  - Example: `bugfix/grid-reorder-position`
- `refactor/{description}` - Code cleanup, no behavior change
  - Example: `refactor/extract-tree-helpers`

**When creating branches:**
- Use kebab-case for descriptions
- Keep names short but descriptive (3-5 words max)
- One feature/fix per branch (suggest splitting if scope grows)

## Commit Message Format

Use conventional commits format when making commits:

```
<type>(<scope>): <short summary>

<optional detailed description>

<optional footer with issue references>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code cleanup, no behavior change
- `docs:` - Documentation only
- `test:` - Adding tests
- `chore:` - Tooling, dependencies, build config

**Examples:**
```
feat(grid): Add sticky drag mode with asymmetric thresholds

Implements asymmetric thresholds to make column drag mode "sticky":
- Enter column mode: vertical < 40px OR horizontal > 2.5x vertical
- Exit column mode: vertical > 80px AND vertical > 1.5x horizontal

This prevents accidental mode switching when dragging through rows.

Fixes #123
```

```
fix(grid): Clear gridColumnStart from all siblings during reorder

Previously only cleared from dragged item, causing mixed auto-flow
and explicit positioning bugs. Now clears from ALL siblings.
```

```
refactor(tree): Extract reorder logic to treeHelpers
```

## When to Suggest Different Workflows

**Suggest a spike branch when:**
- Testing a new approach or algorithm
- User says "let me try something" or "what if we..."
- Uncertainty about whether solution will work
- Example: "Want to create `spike/test-new-threshold` to test this first?"

**Suggest splitting into multiple branches when:**
- Current branch has 3+ unrelated changes
- Scope has grown beyond initial goal
- Multiple distinct bugs/features discovered
- Example: "This is getting large - want to split into `feature/drag-positioning` and `feature/drag-thresholds`?"

**Suggest cleanup before merge when:**
- Multiple WIP commits exist
- Commit messages are not descriptive
- About to merge to main/dev
- Example: "Before merging, want to `git rebase -i` to clean up these 5 commits into 1-2 logical commits?"

## Daily Workflow Guidance

**When user starts work:**
- Check current branch: `git branch --show-current`
- Suggest creating focused feature branch if working from main/dev

**During development:**
- Accept messy commits during iteration (it's OK)
- Don't criticize WIP commits or experimental code
- Suggest spike branches for experiments

**Before merging:**
- Remind about `git rebase -i` to squash commits
- Suggest conventional commit format for final message
- Check that branch name matches what was actually implemented

## Helper Commands to Suggest

When appropriate, suggest these helpful commands:

```bash
# Create focused feature branch
git checkout -b feature/my-feature

# Create spike for experiment
git checkout -b spike/test-idea

# Clean up last N commits
git rebase -i HEAD~5

# Force push after cleanup (safe)
git push --force-with-lease

# Cherry-pick good commit from spike
git cherry-pick abc123

# Delete spike branch after extracting what's useful
git branch -D spike/old-experiment
```

## PR/Merge Guidance

When user mentions creating PR or merging:

1. Suggest cleaning up commits first (`git rebase -i`)
2. Ensure commit messages follow conventional format
3. Verify branch is focused (one feature/fix)
4. After merge, suggest deleting feature branch

## Key Principles

1. **Focused branches** - One feature/fix per branch
2. **Messy during work is OK** - Cleanup happens before merge
3. **Spike branches for experiments** - Throwaway branches are encouraged
4. **Conventional commits in PRs** - Clean history in main/dev
5. **Rebase to clean** - Use `git rebase -i` before merging

## What NOT to Do

- Don't criticize messy commits during active development
- Don't suggest complex git commands without explanation
- Don't force cleanup mid-development (only before merge)
- Don't make branches too granular (balance focus vs overhead)
