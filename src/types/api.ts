export interface PendingPlayerDto {
  seat: number
  name: string
  joinedAt: string
  isSelf: boolean
}

export interface UserStatsDto {
  gamesPlayed: number
  gamesWon: number
  totalScore: number
}

export interface UserDto {
  id: string
  username: string
  createdAt: string
  stats: UserStatsDto
}

export interface AuthPayloadDto {
  token: string
  user: UserDto
}

export interface PendingGameDto {
  id: string
  code: string
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED'
  seats: number
  cardsPerPlayer: number
  createdAt: string
  players: PendingPlayerDto[]
}

export interface CardDto {
  type: string
  color?: string | null
  number?: number | null
}

export interface PlayerStateDto {
  seat: number
  name: string
  cardCount: number
  score: number
  joinedAt: string
  saidUno: boolean
  isSelf: boolean
  isCurrentTurn: boolean
}

export interface RoundStateDto {
  currentPlayerSeat: number | null
  direction: 'CLOCKWISE' | 'COUNTERCLOCKWISE'
  drawPileSize: number
  discardTop?: CardDto | null
  discardColor?: string | null
  myHand: CardDto[]
}

export interface GameLogEntryDto {
  id: string
  message: string
  createdAt: string
}

export interface GameStateDto {
  id: string
  code: string
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED'
  seats: number
  cardsPerPlayer: number
  players: PlayerStateDto[]
  round?: RoundStateDto | null
  events: GameLogEntryDto[]
  winnerSeat?: number | null
  completedAt?: string | null
}

export interface JoinGamePayloadDto {
  playerKey: string
  game: GameStateDto
}
