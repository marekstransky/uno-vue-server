# UNO OOP (TypeScript)

A small object‑oriented implementation of the UNO card game written in TypeScript with a functional flavor and full Jest test suite.

## What’s inside

- Core game model in `src/model`:
  - `deck.ts` – card types, deck factory, and helpers
  - `round.ts` – round flow (play, draw, UNO, scoring, mementos)
  - `uno.ts` – multi‑round game orchestration with target score and mementos
- Deterministic randomness injection via `src/utils/random_utils.ts` (Randomizer, Shuffler)
- Tests in `__test__` covering deck creation, round mechanics, UNO rules, memento serialization, and full game flow
- Simple toolchain: TypeScript + Jest + Babel preset for TS

## Getting started

Prerequisites:
- Node.js 18+ and npm

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Jest is configured to ignore `dist` and runs against the TypeScript sources using Babel.

## Usage overview

This project exposes an in‑memory model (no UI). The main entrypoints are factory functions:

- `createInitialDeck()` and `createDeckFromMemento(memento)` in `deck.ts`
- `createRound({ players, dealer, shuffler, cardsPerPlayer })` and `createRoundFromMemento(memento, shuffler)` in `round.ts`
- `createGame({ players, targetScore, randomizer, shuffler, cardsPerPlayer })` and `createGameFromMemento(memento, randomizer, shuffler)` in `uno.ts`

Randomness is injected for testability:
- `Randomizer: (bound: number) => number` – used to pick the next dealer
- `Shuffler<T>: (items: T[]) => void` – used to shuffle the deck

Default helpers are provided in `random_utils.ts`:
- `standardRandomizer` and `standardShuffler`

### Minimal example (Node)

```ts
import { createGame } from './src/model/uno'
import { standardRandomizer, standardShuffler } from './src/utils/random_utils'

const game = createGame({
  players: ['Alice', 'Bob', 'Cara'],
  targetScore: 200,
  randomizer: standardRandomizer,
  shuffler: standardShuffler,
  cardsPerPlayer: 7,
})

const round = game.currentRound()!

// Inspect current player and possible actions
console.log('In turn:', round.playerInTurn())
console.log('Can play any?', round.canPlayAny())

// Play the first playable card
const hand = round.playerHand(round.playerInTurn()!)
const idx = hand.findIndex((_, i) => round.canPlay(i))
if (idx >= 0) {
  const played = round.play(idx /*, color if WILD */)
  console.log('Played:', played)
} else if (round.canDraw()) {
  const drawn = round.draw()
  console.log('Drew:', drawn)
}

// Serialize/restore
const gameMemento = game.toMemento()
// later: createGameFromMemento(gameMemento, standardRandomizer, standardShuffler)
```

Notes:
- When playing a `WILD` or `WILD DRAW` you must provide a color argument.
- `Round.sayUno(playerIndex)` and `Round.catchUnoFailure({ accuser, accused })` implement the UNO call/punish window.
- A round ends immediately when someone plays the last card; scoring then adds up the opponents’ hands.

## Project scripts

- `npm test` – run all Jest tests

If you want to compile TypeScript to JavaScript, add a build step (not required for tests):

```json
{
  "scripts": {
    "build": "tsc -p ."
  }
}
```

Then run:

```bash
npm run build
```

The output directory is configured as `dist/` in `tsconfig.json`.

## Folder structure

```
uno-oop-ts/
├─ src/
│  ├─ model/
│  │  ├─ deck.ts
│  │  ├─ round.ts
│  │  └─ uno.ts
│  └─ utils/
│     └─ random_utils.ts
├─ __test__/
│  ├─ model/
│  └─ utils/
├─ jest.config.js
├─ babel.config.js
├─ tsconfig.json
└─ package.json
```

## License

ISC
