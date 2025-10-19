import { Randomizer, Shuffler } from '../utils/random_utils'
import { Card, Color } from './deck'
import { Round, createRound, createRoundFromMemento } from './round'

export interface Game {
  readonly playerCount: number
  readonly targetScore: number
  player(index: number): string
  score(index: number): number
  winner(): number | undefined
  currentRound(): Round | undefined
  toMemento(): GameMemento
}

export interface GameMemento {
  players: string[]
  targetScore: number
  scores: number[]
  cardsPerPlayer: number
  currentRound?: {
    players: string[]
    hands: Card[][]
    drawPile: Card[]
    discardPile: Card[]
    currentColor?: Color
    currentDirection: 'clockwise' | 'counterclockwise'
    dealer: number
    playerInTurn?: number
  }
}

class GameImpl implements Game {
  private players: string[]
  private scores: number[]
  private _targetScore: number
  private cardsPerPlayer: number
  private randomizer: Randomizer
  private shuffler: Shuffler<Card>
  private _currentRound?: Round
  private attachRoundHandlers(): void {
    if (!this._currentRound) return
    this._currentRound.onEnd(() => {
      const roundScore = this._currentRound?.score()
      const roundWinner = this._currentRound?.winner()
      if (roundScore !== undefined && roundWinner !== undefined) {
        this.scores[roundWinner] += roundScore
      }
      if (this.winner() === undefined) {
        this.startNewRound()
      } else {
        this._currentRound = undefined
      }
    })
  }

  constructor(
    players: string[] = ['A', 'B'],
    targetScore: number = 500,
    randomizer: Randomizer,
    shuffler: Shuffler<Card>,
    cardsPerPlayer: number = 7
  ) {
    if (!players || players.length < 2) {
      throw new Error('Must have at least 2 players')
    }
    if (targetScore === undefined || targetScore <= 0) {
      throw new Error('Target score must be greater than 0')
    }

    this.players = [...players]
    this.scores = new Array(players.length).fill(0)
    this._targetScore = targetScore
    this.cardsPerPlayer = cardsPerPlayer
    this.randomizer = randomizer
    this.shuffler = shuffler
    
    this.startNewRound()
  }

  get playerCount(): number {
    return this.players.length
  }

  get targetScore(): number {
    return this._targetScore
  }

  player(index: number): string {
    if (index < 0 || index >= this.players.length) {
      throw new Error('Player index out of bounds')
    }
    return this.players[index]
  }

  score(index: number): number {
    if (index < 0 || index >= this.players.length) {
      throw new Error('Player index out of bounds')
    }
    return this.scores[index]
  }

  winner(): number | undefined {
    const winnerIndex = this.scores.findIndex(score => score >= this._targetScore)
    return winnerIndex >= 0 ? winnerIndex : undefined
  }

  currentRound(): Round | undefined {
    return this._currentRound
  }

  private startNewRound(): void {
    const dealer = this.randomizer(this.players.length)
    
    this._currentRound = createRound({
      players: this.players,
      dealer,
      shuffler: this.shuffler,
      cardsPerPlayer: this.cardsPerPlayer
    })
    this.attachRoundHandlers()
  }

  toMemento(): GameMemento {
    const memento: GameMemento = {
      players: [...this.players],
      targetScore: this._targetScore,
      scores: [...this.scores],
      cardsPerPlayer: this.cardsPerPlayer
    }

    if (this._currentRound) {
      const roundMemento = this._currentRound.toMemento()
      memento.currentRound = {
        players: roundMemento.players,
        hands: roundMemento.hands,
        drawPile: roundMemento.drawPile,
        discardPile: roundMemento.discardPile,
        currentColor: roundMemento.currentColor,
        currentDirection: roundMemento.currentDirection,
        dealer: roundMemento.dealer,
        playerInTurn: roundMemento.playerInTurn
      }
    }

    return memento
  }
}

export function createGame(config: {
  players?: string[]
  targetScore?: number
  randomizer?: Randomizer
  shuffler?: Shuffler<Card>
  cardsPerPlayer?: number
}): Game {
  return new GameImpl(
    config.players,
    config.targetScore,
    config.randomizer!,
    config.shuffler!,
    config.cardsPerPlayer
  )
}

export function createGameFromMemento(
  memento: GameMemento,
  randomizer: Randomizer,
  shuffler: Shuffler<Card>
): Game {
  if (memento.targetScore <= 0) {
    throw new Error('Target score must be greater than 0')
  }
  
  if (memento.scores.length !== memento.players.length) {
    throw new Error('Number of scores must match number of players')
  }
  
  if (memento.scores.some(score => score < 0)) {
    throw new Error('Scores cannot be negative')
  }
  
  const winnersCount = memento.scores.filter(score => score >= memento.targetScore).length
  if (winnersCount > 1) {
    throw new Error('Cannot have multiple winners')
  }
  
  const hasWinner = winnersCount > 0
  if (hasWinner && memento.currentRound) {
    throw new Error('Finished game cannot have a current round')
  }
  
  if (!hasWinner && !memento.currentRound) {
    throw new Error('Unfinished game must have a current round')
  }

  const game = new GameImpl(
    memento.players,
    memento.targetScore,
    randomizer,
    shuffler,
    memento.cardsPerPlayer
  )

  ;(game as any).scores = [...memento.scores]

  if (memento.currentRound) {
    ;(game as any)._currentRound = createRoundFromMemento(memento.currentRound, shuffler)
    ;(game as any).attachRoundHandlers()
  } else {
    ;(game as any)._currentRound = undefined
  }

  return game
}
