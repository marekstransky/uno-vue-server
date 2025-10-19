import { PubSub } from 'graphql-subscriptions'
import { v4 as uuid } from 'uuid'
import { createRound, type Round } from '../../src/model/round'
import { standardShuffler } from '../../src/utils/random_utils'
import type { Color } from '../../src/model/deck'
import type { GameLogEntry, GamePlayerRecord, GameStatus, RunningGame } from '../types'
import type { UserRepository } from '../data/userRepository'

export const PENDING_GAMES_TOPIC = 'PENDING_GAMES'
export const GAME_UPDATED_TOPIC = 'GAME_UPDATED'

interface CreateGameArgs {
  name: string
  seats: number
  cardsPerPlayer: number
  userId?: string
}

interface JoinGameArgs {
  gameId: string
  name: string
  userId?: string
}

interface ActionArgs {
  gameId: string
  playerKey: string
}

interface JoinResult {
  game: RunningGame
  playerKey: string
}

const MIN_PLAYERS = 2
const MAX_PLAYERS = 4
const MIN_CARDS = 5
const MAX_CARDS = 10

const describeCard = (card: any, color?: Color) => {
  switch (card.type) {
    case 'NUMBERED':
      return `${card.color} ${card.number}`
    case 'SKIP':
    case 'REVERSE':
    case 'DRAW':
      return `${card.color} ${card.type}`
    case 'WILD':
      return color ? `WILD (${color})` : 'WILD'
    case 'WILD DRAW':
      return color ? `WILD DRAW (${color})` : 'WILD DRAW'
    default:
      return 'Unknown card'
  }
}

const mapCard = (card: any) => {
  if (!card) return null
  if (card.type === 'NUMBERED') {
    return { type: card.type as string, color: card.color as string, number: card.number as number }
  }
  if (card.type === 'SKIP' || card.type === 'REVERSE' || card.type === 'DRAW') {
    return { type: card.type as string, color: card.color as string }
  }
  return { type: card.type as string }
}

const generateCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * alphabet.length)
    code += alphabet[idx]
  }
  return code
}

const normalizeSeats = (game: RunningGame) => {
  game.players
    .sort((a, b) => a.seat - b.seat)
    .forEach((player, index) => {
      player.seat = index
    })
}

const orderedPlayers = (game: RunningGame) => [...game.players].sort((a, b) => a.seat - b.seat)

const ensurePlayer = (game: RunningGame, playerKey: string) => {
  const found = game.players.find(p => p.playerKey === playerKey)
  if (!found) {
    throw new Error('Player is not part of this game')
  }
  return found
}

const ensurePending = (game: RunningGame) => {
  if (game.status !== 'PENDING') {
    throw new Error('Game has already started')
  }
}

const ensureActive = (game: RunningGame) => {
  if (game.status !== 'ACTIVE') {
    throw new Error('Game is not active')
  }
  if (!game.round) {
    throw new Error('Missing round data')
  }
}

const nowIso = () => new Date().toISOString()

const truncateLogs = (game: RunningGame) => {
  if (game.logs.length > 50) {
    game.logs.splice(0, game.logs.length - 50)
  }
}

export class GameManager {
  private readonly games = new Map<string, RunningGame>()

  constructor(private readonly pubsub: PubSub, private readonly userRepo?: UserRepository) {}

  getPubSub(): PubSub {
    return this.pubsub
  }

  listPendingGames(): RunningGame[] {
    return [...this.games.values()].filter(game => game.status === 'PENDING')
  }

  getGame(gameId: string): RunningGame | undefined {
    return this.games.get(gameId)
  }

  createGame(args: CreateGameArgs): JoinResult {
    const { name, seats, cardsPerPlayer } = args
    if (seats < MIN_PLAYERS || seats > MAX_PLAYERS) {
      throw new Error('Seats must be between 2 and 4')
    }
    if (cardsPerPlayer < MIN_CARDS || cardsPerPlayer > MAX_CARDS) {
      throw new Error('Cards per player must be between 5 and 10')
    }

    const id = uuid()
    const game: RunningGame = {
      id,
      code: generateCode(),
      status: 'PENDING',
      seats,
      cardsPerPlayer,
      creatorKey: '',
      createdAt: nowIso(),
      players: [],
      logs: [],
      lastUpdate: nowIso()
    }

    this.games.set(id, game)
  const { playerKey, player } = this.joinInternal(game, name, args.userId)
    game.creatorKey = playerKey
    this.addLog(game, `${player.name} created the table`)
    this.publishPending(game)
    return { game, playerKey }
  }

  joinGame(args: JoinGameArgs): JoinResult {
    const game = this.games.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }
    ensurePending(game)
  const { playerKey, player } = this.joinInternal(game, args.name, args.userId)
    this.addLog(game, `${player.name} joined the table`)
    this.publishPending(game)
    return { game, playerKey }
  }

  private joinInternal(game: RunningGame, name: string, userId?: string): { playerKey: string; player: GamePlayerRecord } {
    const trimmed = name.trim()
    if (!trimmed) {
      throw new Error('Player name is required')
    }
    if (game.players.length >= game.seats) {
      throw new Error('Game is full')
    }
    if (userId && game.players.some(player => player.userId === userId)) {
      throw new Error('You are already seated at this table')
    }
    const seat = this.findFirstSeat(game)
    const playerKey = uuid()
    const record: GamePlayerRecord = {
      seat,
      playerKey,
      name: trimmed,
      joinedAt: nowIso(),
      score: 0,
      saidUno: false,
      lastActionAt: nowIso(),
      userId
    }
    game.players.push(record)
    normalizeSeats(game)
    game.lastUpdate = nowIso()
    return { playerKey, player: record }
  }

  private findFirstSeat(game: RunningGame): number {
    const taken = new Set(game.players.map(p => p.seat))
    for (let seat = 0; seat < game.seats; seat++) {
      if (!taken.has(seat)) return seat
    }
    return game.players.length
  }

  startGame(args: ActionArgs): RunningGame {
    const game = this.games.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }
    ensurePending(game)
    const player = ensurePlayer(game, args.playerKey)
    if (game.creatorKey !== player.playerKey) {
      throw new Error('Only the table host can start the game')
    }
    if (game.players.length < MIN_PLAYERS) {
      throw new Error('Need at least two players to start')
    }

    const participants = orderedPlayers(game)
    const playerNames = participants.map(p => p.name)
    const dealer = Math.floor(Math.random() * participants.length)
    const round = createRound({ players: playerNames, dealer, shuffler: standardShuffler, cardsPerPlayer: game.cardsPerPlayer })

    round.onEnd(async result => {
      try {
        const winnerSeat = typeof result?.winner === 'number' ? result.winner : round.winner()
        game.winnerSeat = typeof winnerSeat === 'number' ? winnerSeat : undefined
        game.status = 'COMPLETED'
        game.completedAt = nowIso()
        const roundScore = round.score() ?? 0
        if (game.winnerSeat !== undefined) {
          const winnerPlayer = game.players.find(p => p.seat === game.winnerSeat)
          if (winnerPlayer) {
            winnerPlayer.score += roundScore
          }
        }
        if (this.userRepo) {
          const participantIds = game.players
            .map(player => player.userId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
          if (participantIds.length > 0) {
            const winnerId = game.winnerSeat !== undefined
              ? game.players.find(player => player.seat === game.winnerSeat)?.userId
              : undefined
            await this.userRepo.recordRoundResult({
              participants: participantIds,
              winnerId,
              pointsAwarded: roundScore
            })
          }
        }
        this.addLog(game, 'Round finished')
      } catch (error) {
        console.error('Failed to finalize round', error)
        this.addLog(game, 'Round finished with errors')
      } finally {
        this.publishGame(game)
      }
    })

    game.round = round
    game.status = 'ACTIVE'
    game.startedAt = nowIso()
    game.players.forEach(player => {
      player.saidUno = false
      player.lastActionAt = nowIso()
    })
    this.addLog(game, 'Round started')
    this.publishPending(game)
    this.publishGame(game)
    return game
  }

  playCard(args: ActionArgs & { cardIndex: number; color?: Color }): RunningGame {
    const game = this.games.get(args.gameId)
    if (!game) throw new Error('Game not found')
    ensureActive(game)
    const round = game.round as Round
    const player = ensurePlayer(game, args.playerKey)
    const memento = round.toMemento()
    const seat = player.seat
    if (round.playerInTurn() !== seat) {
      throw new Error('It is not your turn')
    }
    const hand = memento.hands[seat]
    const card = hand?.[args.cardIndex]
    if (!card) {
      throw new Error('Invalid card index')
    }
    const played = round.play(args.cardIndex, args.color)
    player.lastActionAt = nowIso()
    const summary = describeCard(played, args.color)
    this.addLog(game, `${player.name} played ${summary}`)
    player.saidUno = false
    this.publishGame(game)
    return game
  }

  drawCard(args: ActionArgs): RunningGame {
    const game = this.games.get(args.gameId)
    if (!game) throw new Error('Game not found')
    ensureActive(game)
    const round = game.round as Round
    const player = ensurePlayer(game, args.playerKey)
    const seat = player.seat
    if (round.playerInTurn() !== seat) {
      throw new Error('It is not your turn')
    }
    round.draw()
    player.lastActionAt = nowIso()
    player.saidUno = false
    this.addLog(game, `${player.name} drew a card`)
    this.publishGame(game)
    return game
  }

  sayUno(args: ActionArgs): RunningGame {
    const game = this.games.get(args.gameId)
    if (!game) throw new Error('Game not found')
    ensureActive(game)
    const round = game.round as Round
    const player = ensurePlayer(game, args.playerKey)
    round.sayUno(player.seat)
    player.saidUno = true
    this.addLog(game, `${player.name} says UNO!`)
    this.publishGame(game)
    return game
  }

  catchUno(args: ActionArgs & { accusedSeat: number }): RunningGame {
    const game = this.games.get(args.gameId)
    if (!game) throw new Error('Game not found')
    ensureActive(game)
    const round = game.round as Round
    const accuser = ensurePlayer(game, args.playerKey)
    const accused = game.players.find(p => p.seat === args.accusedSeat)
    if (!accused) {
      throw new Error('Accused player not found')
    }
    const success = round.catchUnoFailure({ accuser: accuser.seat, accused: accused.seat })
    if (success) {
      accused.saidUno = false
    }
    this.addLog(game, success
      ? `${accuser.name} called UNO on ${accused.name}`
      : `${accuser.name} attempted to call UNO on ${accused.name}`)
    this.publishGame(game)
    return game
  }

  leaveGame(args: ActionArgs): boolean {
    const game = this.games.get(args.gameId)
    if (!game) throw new Error('Game not found')
    if (game.status === 'ACTIVE') {
      throw new Error('Cannot leave an active game')
    }
    const index = game.players.findIndex(p => p.playerKey === args.playerKey)
    if (index === -1) return false
    const [player] = game.players.splice(index, 1)
    normalizeSeats(game)
    this.addLog(game, `${player.name} left the table`)
    game.lastUpdate = nowIso()
    if (game.players.length === 0) {
      this.games.delete(game.id)
    } else if (game.creatorKey === player.playerKey) {
      game.creatorKey = game.players[0].playerKey
    }
    this.publishPending(game)
    return true
  }

  buildPendingGame(game: RunningGame, viewerKey?: string | null) {
    return {
      id: game.id,
      code: game.code,
      status: game.status as GameStatus,
      seats: game.seats,
      cardsPerPlayer: game.cardsPerPlayer,
      createdAt: game.createdAt,
      players: orderedPlayers(game).map(player => ({
        seat: player.seat,
        name: player.name,
        joinedAt: player.joinedAt,
        isSelf: viewerKey ? player.playerKey === viewerKey : false
      }))
    }
  }

  buildGameState(game: RunningGame, viewerKey?: string | null) {
    const round = game.round
    const viewer = viewerKey ? game.players.find(p => p.playerKey === viewerKey) : undefined
    const memento = round ? round.toMemento() : undefined
    const players = orderedPlayers(game).map(player => {
      const cardCount = memento ? memento.hands[player.seat]?.length ?? 0 : 0
      const isCurrent = memento?.playerInTurn === player.seat
      return {
        seat: player.seat,
        name: player.name,
        cardCount,
        score: player.score,
        joinedAt: player.joinedAt,
        saidUno: player.saidUno,
        isSelf: viewerKey ? player.playerKey === viewerKey : false,
        isCurrentTurn: Boolean(isCurrent)
      }
    })

    const roundState = memento && round
      ? {
          currentPlayerSeat: memento.playerInTurn ?? null,
          direction: memento.currentDirection === 'clockwise' ? 'CLOCKWISE' : 'COUNTERCLOCKWISE',
          drawPileSize: round.drawPile().size,
          discardTop: mapCard(memento.discardPile?.[0]) ?? undefined,
          discardColor: memento.currentColor ?? null,
          myHand: viewer ? (memento.hands[viewer.seat] ?? []).map(mapCard) : []
        }
      : null

    return {
      id: game.id,
      code: game.code,
      status: game.status as GameStatus,
      seats: game.seats,
      cardsPerPlayer: game.cardsPerPlayer,
      players,
      round: roundState,
      events: game.logs.map((log: GameLogEntry) => ({ id: log.id, message: log.message, createdAt: log.createdAt })),
      winnerSeat: typeof game.winnerSeat === 'number' ? game.winnerSeat : null,
      completedAt: game.completedAt ?? null
    }
  }

  private addLog(game: RunningGame, message: string): void {
    const entry: GameLogEntry = {
      id: uuid(),
      message,
      createdAt: nowIso()
    }
    game.logs.push(entry)
    truncateLogs(game)
    game.lastUpdate = entry.createdAt
  }

  private publishPending(game: RunningGame): void {
    this.pubsub.publish(PENDING_GAMES_TOPIC, { pendingGames: { gameId: game.id } })
  }

  private publishGame(game: RunningGame): void {
    this.pubsub.publish(GAME_UPDATED_TOPIC, { gameUpdates: { gameId: game.id } })
  }
}
