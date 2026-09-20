# Deployment

Run `bun run build` and publish `dist/` to an HTTPS static host with SPA fallback to `index.html`. No backend or runtime secrets are required. HTTPS or localhost is required for service workers, Web Locks, and persistence APIs. Keep `dist-cli/` out of the browser deployment.

Serve hashed `/assets/` files with immutable caching. Serve `index.html` and `sw.js` with revalidation so updates can be discovered. Do not rewrite missing asset requests to HTML. Keep the previous deployment available until the new build's complete asset set is uploaded.

`Dockerfile` and `deploy/nginx.conf` provide a static server on port 8080. Put HTTPS termination in front of it for remote use.

## Offline use and updates

The service worker caches bundled examples and application assets after the first successful online load. The app saves the active project before activating an update. Execution history is session-only and resets on updates or reloads.

Project storage belongs to the deployment origin. Moving to a different hostname or port requires export/import. Export `.loom.json` files for portable backups.

**Help** shows the running app's build commit. See [testing](TESTING.md) for optional production browser checks, performance measurements, and the extended soak test.
