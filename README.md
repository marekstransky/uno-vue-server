# UNO Against Bots

Play a full Uno round against a squad of browser bots. The UI is built with Vue 3 and Pinia, while the game rules come from a TypeScript engine that is shared with the Jest test suite.

## Highlights

- Vue 3 + Vite front end with setup, match, and results views (`src/views`).
- Bot opponents run inside a Web Worker (`src/workers/bot.worker.ts`) and choose cards with a light-weight heuristic.
- Core Uno engine lives in plain TypeScript (`src/model`) so the same logic powers tests and the UI.
- Pinia store (`src/stores/matchStore.ts`) keeps the table setup and round summary in sync across routes.
- Jest tests in `__test__` cover deck creation, round flow, UNO calls, and memento restore.

## Getting Started

1. Install Node.js 18 or newer.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev` (open the printed URL, usually `http://localhost:5173`).
4. Run the Jest suite: `npm test`
5. Create a production build: `npm run build`; preview it with `npm run preview`.

## Game Flow

- `SetupView.vue` lets you name yourself, pick bot rivals, and choose cards per player.
- `GameView.vue` renders the round, human hand, bot statuses, event log, and UNO catch window.
- `ResultView.vue` shows round points and remaining cards, with quick rematch or new setup options.
- Bot personalities (chance to forget or catch UNO) are generated in the setup view and passed through the Pinia store.

## Under the Hood

- UNO card types, rounds, and multi-round helpers sit in `src/model` (`deck.ts`, `round.ts`, `uno.ts`, `cards.ts`).
- Randomness is injected via the shuffler/randomizer helpers in `src/utils/random_utils.ts` for deterministic tests.
- `src/bots` defines the message protocol and `BotController` that proxies calls to the worker.
- Styles are kept in `src/styles/global.css` and component-scoped blocks (see `src/components/UnoCard.vue`).

## License

ISC
