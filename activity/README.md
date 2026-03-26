# Marble Race — Discord Activity

A multiplayer marble race game built as a Discord Embedded App (Activity). Players join from a voice channel and race procedurally generated marble tracks with their Discord avatars.

## Tech Stack

- **Client**: Vite + React + Phaser 3 (Matter.js physics)
- **Server**: Express + Colyseus (WebSocket rooms)
- **Protocol**: Discord Embedded App SDK

---

## Setup

### 1. Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Under **Activities**, enable the Activity feature
4. Note your **Client ID** and **Client Secret**

### 2. Configure URL Mappings (Discord Developer Portal)

In your app's **Activities** settings, add these URL mappings:

| Prefix | Target |
|--------|--------|
| `/` | `https://your-frontend-domain.com` |
| `/api` | `https://your-backend-domain.com` |
| `/socket.io` | `https://your-backend-domain.com` |

### 3. Environment Variables

**Root `.env`** (or `server/.env`):
```env
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
PORT=2567
```

**`client/.env`**:
```env
VITE_DISCORD_CLIENT_ID=your_discord_client_id
```

---

## Local Development

### Prerequisites
- Node.js 18+
- npm 8+

### Install dependencies
```bash
# From activity/ root
npm install
cd server && npm install
cd ../client && npm install
```

### Run locally with cloudflared

Discord Activities require HTTPS even in development. Use cloudflared to tunnel:

```bash
# Terminal 1 — start server
cd server && npm run dev

# Terminal 2 — start client
cd client && npm run dev

# Terminal 3 — tunnel the client (port 5173)
cloudflared tunnel --url http://localhost:5173

# Terminal 4 — tunnel the server (port 2567)
cloudflared tunnel --url http://localhost:2567
```

Then in the Discord Developer Portal, set the URL Mappings to your cloudflared URLs.

### Running without cloudflare (Vite proxy)

In development, Vite proxies `/api` and `/socket.io` to `localhost:2567` automatically.

```bash
cd activity
npm run dev
```

---

## Deployment

### Server (Node.js host — Railway, Render, Fly.io, etc.)

```bash
cd server
npm run build
npm start
```

Set env vars: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `PORT`

### Client (Static host — Vercel, Cloudflare Pages, etc.)

```bash
cd client
npm run build
# Upload dist/ to your static host
```

Set env var: `VITE_DISCORD_CLIENT_ID`

---

## How to Play

1. Start a voice channel in your Discord server
2. Launch the **Marble Race** Activity
3. Wait for friends to join (up to 8 players)
4. The **host** (first to join) clicks **Lancer la partie**
5. After countdown, marbles race down the procedurally generated track
6. First marble to cross the finish line wins!

---

## Architecture

```
activity/
├── client/         # Vite + React shell + Phaser 3 game
│   └── src/
│       ├── App.tsx              # Discord SDK auth + Colyseus connection
│       ├── discord.ts           # SDK singleton
│       ├── scenes/
│       │   ├── LobbyScene.ts   # Player list, host start button
│       │   └── RaceScene.ts    # Physics race with avatar marbles
│       └── types.ts
├── server/         # Express + Colyseus
│   └── src/
│       ├── index.ts             # HTTP server + token endpoint
│       ├── rooms/MarbleRoom.ts  # Game room logic
│       └── schemas/             # Colyseus state schemas
└── package.json    # Workspaces root
```

## Colyseus Monitor

In development, visit `http://localhost:2567/colyseus` to inspect rooms and state.
