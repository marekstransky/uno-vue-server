# UNO Arena – Assignment 3

This project implements the Assignment 3 requirements for the Web3 course: a multiplayer UNO experience backed by a GraphQL server. Players choose a display name, host new tables, join existing games, and play complete UNO rounds against 1–3 human opponents. Real-time updates are delivered through GraphQL subscriptions.

## Getting started

Install dependencies once:

```powershell
npm install
```

### Start the GraphQL server

```powershell
npm run server:dev
```

The server runs on [http://localhost:4000/graphql](http://localhost:4000/graphql) and exposes both HTTP queries/mutations and WebSocket subscriptions. CORS is configured for the Vite dev server (`http://localhost:5173`).

### Start the Vue client

```powershell
npm run dev
```

Open the client at [http://localhost:5173](http://localhost:5173). Use the lobby to set your name, create tables, join games, and play.

## Key features

- **User accounts with nickname support** – Players register and log in with credentials. A join token is still issued per game so they can reconnect after a refresh while keeping their chosen display name.
- **GraphQL API** – Apollo Server v4 with Express delivers the schema. Queries/mutations cover table lifecycle and UNO actions (`playCard`, `drawCard`, `sayUno`, `catchUno`).
- **Subscriptions** – `pendingGames` keeps the lobby in sync; `gameUpdates` pushes state changes to all seated players.
- **UNO engine reuse** – The shared model (`src/model`) powers the server-side round controller, ensuring identical rules between client and automated tests.
- **Vue 3 + Pinia client** – The lobby, authentication flow, and game room are rebuilt around GraphQL operations. Apollo Client (HTTP + `graphql-ws`) drives all network communication.

## Code structure

```
server/
  index.ts            # Apollo/Express bootstrap
  schema.ts           # GraphQL SDL + resolvers
  context.ts          # Shared context for HTTP and WS
  game/gameManager.ts # In-memory game orchestration
src/graphql/          # Apollo client, operations, helpers
src/views/            # Lobby and game room UIs
src/stores/           # Pinia store for player identity
```

## Useful scripts

| Script | Description |
| --- | --- |
| `npm run server:dev` | Run the GraphQL server in development mode (tsx) |
| `npm run server:build` | Compile server TypeScript to `dist/server` |
| `npm run server:start` | Launch the compiled server from `dist` |
| `npm run dev` | Start the Vite client |
| `npm test` | Run existing Jest model tests |

## GraphQL playground

With the server running you can interact via any GraphQL tool using the endpoint `http://localhost:4000/graphql`. Subscriptions are available over WebSocket at `ws://localhost:4000/graphql`.
