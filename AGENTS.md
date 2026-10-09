# Open Herbology project workflow

## Primary branch

The repository's primary/default branch is currently `master`. When the user refers to updating "main", use the verified existing primary branch; do not create or rename a branch solely because of that wording.

## GitHub and local synchronization

The user requires local source to be updated whenever changes are pushed or merged to GitHub. After an approved push, merge, or connector-based source update:

- Synchronize the active local checkout's files and Git HEAD to the final remote revision.
- Synchronize other local worktrees used for the same change when they would otherwise retain stale source.
- Preserve unrelated local changes before synchronization; never silently discard them.
- Verify that local and remote revisions agree and report the actual branch/release status.

Do not leave a completed GitHub update with local source or HEAD pointing to an earlier version.
