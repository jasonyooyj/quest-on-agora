---
description: "Commits, version bumps, and pushes changes to the remote repository. Usage: /ship [optional: commit message context]"
---
1. **Analyze Changes**
   - Run `git status` to see changed files.
   - Run `git diff` to see detailed changes.
   - Run `git log -5 --oneline` to see recent commit style.

2.  **Determine Version Updates**
    - Read the current version from `package.json` and `CLAUDE.md`.
    - Ask the user which semantic version bump is appropriate (patch, minor, major) based on the analyzed changes.
      - **patch** (e.g., 0.9.2 -> 0.9.3): Bug fixes, small improvements.
      - **minor** (e.g., 0.9.3 -> 0.10.0): New features, backward-compatible changes.
      - **major** (e.g., 0.10.0 -> 1.0.0): Breaking changes.
    - Ask the user for the commit message title and details.

3.  **Update Version Files**
    - Update the `version` field in `package.json` to the new version.
    - Update the `Version` line in `CLAUDE.md` to the new version.

4.  **Create Commit**
    - Construct the commit message primarily in Korean (unless context suggests otherwise) using the following format:
      ```
      <type>: <Title> (limit 50 chars)

      <Body>
      - Detailed description of changes.
      - Reason for changes.
      - Impact scope.

      🤖 Generated with [Claude Code](https://claude.com/claude-code)

      Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
      ```
    - Use appropriate commit types:
      - `feat`: New features (minor/patch)
      - `fix`: Bug fixes (patch)
      - `refactor`: Code restructuring (patch)
      - `style`: Formatting changes (patch)
      - `docs`: Documentation updates (no version bump needed typically, but sync if doing so)
      - `test`: Adding missing tests (no version bump needed typically)
      - `chore`: Build tasks, package manager configs, etc. (patch)
    - Run `git add .` to stage all changes.
    - Run `git commit -m "YOUR_CONSTRUCTED_MESSAGE"`

5.  **Push Changes**
    - Run `git push origin main` (or the current branch).
    - **Note:** Do NOT use force push. Ensure you are pulled up to date if needed, though this workflow assumes you are ahead.

6.  **Verify**
    - Run `grep '"version"' package.json` and `grep 'Version' CLAUDE.md` to confirm the version update.
