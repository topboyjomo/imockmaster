# 🎭 mockmaster

> Zero-config mock server that auto-generates realistic API responses from TypeScript interfaces or JSON schemas.

[![CI](https://img.shields.io/github/actions/workflow/status/yourusername/mockmaster/ci.yml?style=for-the-badge)](https://github.com/yourusername/mockmaster/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](./LICENSE)
[![Codespace Ready](https://img.shields.io/badge/Codespace-Ready-green?style=for-the-badge&logo=github)](https://codespaces.new/yourusername/mockmaster)

---

## 🚀 What is mockmaster?

`mockmaster` spins up a local API mock server in seconds. Point it at your OpenAPI spec, JSON schema, or TypeScript interfaces and it generates realistic fake data for every endpoint — names, emails, dates, numbers, all contextually appropriate.

```bash
mockmaster serve openapi.json --port 3001
mockmaster serve schema.json --port 3001 --delay 200
mockmaster serve . --watch                    # auto-reload on file change
mockmaster generate openapi.json              # preview generated responses
mockmaster demo                               # start demo server
```

## ✨ Features
- 🚀 Instant mock server from OpenAPI/JSON Schema
- 🎲 Contextually realistic fake data (names, emails, dates, UUIDs)
- ⏱️  Configurable response delay for latency simulation
- 🔴 Error injection (random 500s, 429s for rate limit testing)
- 🔄 Watch mode — reloads on spec changes
- 📋 Request logging with response times
- 🌐 CORS enabled by default

## 📋 Sample Interaction
```
🎭 mockmaster — serving on http://localhost:3001
──────────────────────────────────────────────
GET  /api/users         → 200  [12ms]  3 users
POST /api/users         → 201  [8ms]   created
GET  /api/users/42      → 200  [5ms]   {"id":42,"name":"Alice Chen"...}
GET  /api/users/999     → 404  [3ms]   not found
DELETE /api/users/42    → 204  [6ms]   deleted
```

## 🏆 Achievement Scripts
```bash
bash scripts/setup.sh && bash scripts/unlock-all.sh
```
## 🤝 Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md)
