# Development compatibility policy

Loom has never been released. V1, v2, and future v3 work are development iterations, not supported release formats.

- Do not add version migrations, compatibility adapters for old project formats, or protected pre-upgrade backups.
- Validate and accept only the current project format. Reject incompatible files without rewriting them or replacing the open project.
- Ordinary save recovery, current-format import/export, and PWA application updates remain supported.
