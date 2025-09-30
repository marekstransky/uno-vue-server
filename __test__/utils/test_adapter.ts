import { Randomizer, Shuffler, standardRandomizer, standardShuffler } from '../../src/utils/random_utils'
import { Card, Deck, createInitialDeck as createInitialDeckImpl, createDeckFromMemento as createDeckFromMementoImpl } from '../../src/model/deck'
import { Round, createRound as createRoundImpl, createRoundFromMemento as createRoundFromMementoImpl } from '../../src/model/round'
import { Game, createGame as createGameImpl, createGameFromMemento as createGameFromMementoImpl, GameMemento } from '../../src/model/uno'

export function createInitialDeck(): Deck {
  return createInitialDeckImpl()
}

export function createDeckFromMemento(cards: Record<string, string | number>[]): Deck {
  return createDeckFromMementoImpl(cards)
}

export type HandConfig = {
  players: string[]
  dealer: number
  shuffler?: Shuffler<Card>
  cardsPerPlayer?: number
}

export function createRound({
    players, 
    dealer, 
    shuffler = standardShuffler,
    cardsPerPlayer = 7
  }: HandConfig): Round {
  return createRoundImpl({
    players,
    dealer,
    shuffler,
    cardsPerPlayer
  })
}

export function createRoundFromMemento(memento: any, shuffler: Shuffler<Card> = standardShuffler): Round {
  return createRoundFromMementoImpl(memento, shuffler)
}

export type GameConfig = {
  players: string[]
  targetScore: number
  randomizer: Randomizer
  shuffler: Shuffler<Card>
  cardsPerPlayer: number
}

export function createGame(props: Partial<GameConfig>): Game {
  return createGameImpl({
    players: props.players ?? ['A', 'B'],
    targetScore: props.targetScore ?? 500,
    randomizer: props.randomizer ?? standardRandomizer,
    shuffler: props.shuffler ?? standardShuffler,
    cardsPerPlayer: props.cardsPerPlayer ?? 7
  })
}

export function createGameFromMemento(memento: GameMemento, randomizer: Randomizer = standardRandomizer, shuffler: Shuffler<Card> = standardShuffler): Game {
  return createGameFromMementoImpl(memento, randomizer, shuffler)
}
