# Nightline 4.0

A fresh rebuild with a redesigned UI and a Node.js + SQL.js backend.

## Run
```cmd
npm install
npm start
```
Open http://localhost:5000

## Included
- 11+ sign-in check
- private password rooms
- room-name + password login
- `/cm` workspace
- owner-only room deletion
- 48-hour automatic expiry
- text and file messages
- member-only file access
- Groq / Mistral / OpenRouter commands
- SQL database persisted to `DB_PATH`
- Node 26 friendly: no better-sqlite3/native addon
- security headers
- rate limits
- graceful database save on shutdown
- `/healthz`

For Railway, use a persistent volume and set:
`DB_PATH=/data/nightline.sqlite`
`UPLOAD_DIR=/data/uploads`

Never commit `.env` or real API keys.
