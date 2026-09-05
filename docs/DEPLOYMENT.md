# Deployment

`npm run build` produces the complete static application in `dist/`. No backend or runtime secrets are required. Publish that directory to an HTTPS static host with SPA fallback to `index.html`. HTTPS (or localhost) is required for Web Locks, service workers, and persistence APIs.

Serve hashed `/assets/` files with immutable caching. Serve `index.html` and `sw.js` with revalidation so updates can be discovered. Do not rewrite missing asset requests to HTML. Keep the previous deployment available until the new build's complete asset set is uploaded.

`Dockerfile` and `deploy/nginx.conf` provide a static server on port 8080. Put HTTPS termination in front of it for remote use. The container deployment configuration has been authored; an image deployment has not been performed in this workspace.

The app prompts before activating an update and flushes its project save first. The browser's project data belongs to the deployment origin. Moving to a different hostname or port requires export/import; it is not a cloud migration.

Before publishing a release, complete the remaining entries in `PHASES.md`, run the production browser checks, and inspect the exact deployed artifact. The GitHub workflow runs domain tests, builds, and browser checks and retains failure evidence. The workflow is configured but has not yet run on GitHub.
