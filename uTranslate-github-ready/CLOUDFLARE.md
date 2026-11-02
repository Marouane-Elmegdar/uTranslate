# Cloudflare deployment

This repository deploys the ULearning translation review tool as static assets.

- Production assets are stored in `public/`.
- `wrangler.jsonc` configures the Cloudflare Worker.
- No translation projects, review backups, credentials, or Tolgee tokens belong in this repository.
- Cloudflare automatically deploys changes pushed to the production branch after the GitHub integration is connected.

Cloudflare build settings:

- Build command: leave blank
- Deploy command: `npx wrangler deploy`
- Root directory: repository root
