import type { Round } from '../src/model/round'

export type GameStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED'

export interface GameLogEntry {
  id: string
  message: string
  createdAt: string
}

export interface GamePlayerRecord {
  seat: number
  playerKey: string
  name: string
  joinedAt: string
  score: number
  saidUno: boolean
  lastActionAt: string
  userId?: string
}

export interface RunningGame {
  id: string
  code: string
  status: GameStatus
  seats: number
  cardsPerPlayer: number
  creatorKey: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  winnerSeat?: number
  round?: Round
  players: GamePlayerRecord[]
  logs: GameLogEntry[]
  pendingUnoSeat?: number
  lastUpdate: string
}

export interface UserStatsRecord {
  gamesPlayed: number
  gamesWon: number
  totalScore: number
}

export interface UserRecord {
  id: string
  username: string
  passwordHash: string
  createdAt: string
  stats: UserStatsRecord
}
