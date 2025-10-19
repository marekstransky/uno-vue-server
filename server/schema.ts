import { withFilter } from 'graphql-subscriptions'
import { makeExecutableSchema } from '@graphql-tools/schema'
import type { Color } from '../src/model/deck'
import { GAME_UPDATED_TOPIC, PENDING_GAMES_TOPIC } from './game/gameManager'
import type { GraphQLContext } from './context'

const COLORS: Color[] = ['RED', 'GREEN', 'BLUE', 'YELLOW']

const typeDefs = /* GraphQL */ `
  enum GameStatus {
    PENDING
    ACTIVE
    COMPLETED
  }

  enum Direction {
    CLOCKWISE
    COUNTERCLOCKWISE
  }

  type UserStats {
    gamesPlayed: Int!
    gamesWon: Int!
    totalScore: Int!
  }

  type User {
    id: ID!
    username: String!
    createdAt: String!
    stats: UserStats!
  }

  type AuthPayload {
    token: ID!
    user: User!
  }

  type Card {
    type: String!
    color: String
    number: Int
  }

  type GameLogEntry {
    id: ID!
    message: String!
    createdAt: String!
  }

  type PendingPlayer {
    seat: Int!
    name: String!
    joinedAt: String!
    isSelf: Boolean!
  }

  type PendingGame {
    id: ID!
    code: String!
    status: GameStatus!
    seats: Int!
    cardsPerPlayer: Int!
    createdAt: String!
    players: [PendingPlayer!]!
  }

  type PlayerState {
    seat: Int!
    name: String!
    cardCount: Int!
    score: Int!
    joinedAt: String!
    saidUno: Boolean!
    isSelf: Boolean!
    isCurrentTurn: Boolean!
  }

  type RoundState {
    currentPlayerSeat: Int
    direction: Direction!
    drawPileSize: Int!
    discardTop: Card
    discardColor: String
    myHand: [Card!]!
  }

  type GameState {
    id: ID!
    code: String!
    status: GameStatus!
    seats: Int!
    cardsPerPlayer: Int!
    players: [PlayerState!]!
    round: RoundState
    events: [GameLogEntry!]!
    winnerSeat: Int
    completedAt: String
  }

  type JoinGamePayload {
    playerKey: ID!
    game: GameState!
  }

  type Query {
    pendingGames(playerKey: ID): [PendingGame!]!
    game(id: ID!, playerKey: ID): GameState
    me: User
  }

  type Mutation {
    register(username: String!, password: String!): AuthPayload!
    login(username: String!, password: String!): AuthPayload!
    logout: Boolean!
    createGame(name: String!, seats: Int!, cardsPerPlayer: Int!): JoinGamePayload!
    joinGame(gameId: ID!, name: String!): JoinGamePayload!
    startGame(gameId: ID!, playerKey: ID!): GameState!
    playCard(gameId: ID!, playerKey: ID!, cardIndex: Int!, color: String): GameState!
    drawCard(gameId: ID!, playerKey: ID!): GameState!
    sayUno(gameId: ID!, playerKey: ID!): GameState!
    catchUno(gameId: ID!, playerKey: ID!, accusedSeat: Int!): GameState!
    leaveGame(gameId: ID!, playerKey: ID!): Boolean!
  }

  type Subscription {
    pendingGames(playerKey: ID): PendingGame!
    gameUpdates(gameId: ID!, playerKey: ID): GameState!
  }
`

const requireAuth = (context: GraphQLContext) => {
  if (!context.currentUser) {
    throw new Error('Authentication required')
  }
  return context.currentUser
}

const resolvers = {
  Query: {
    pendingGames: (_: unknown, args: { playerKey?: string | null }, context: GraphQLContext) => {
      return context.games.listPendingGames().map(game => context.games.buildPendingGame(game, args.playerKey ?? null))
    },
    game: (_: unknown, args: { id: string; playerKey?: string | null }, context: GraphQLContext) => {
      const game = context.games.getGame(args.id)
      if (!game) return null
      return context.games.buildGameState(game, args.playerKey ?? null)
    },
    me: (_parent: unknown, _args: unknown, context: GraphQLContext) => context.currentUser
  },
  Mutation: {
    register: async (_: unknown, args: { username: string; password: string }, context: GraphQLContext) => {
      const user = await context.users.register(args.username, args.password)
      const token = context.sessions.createSession(user.id)
      return { token, user }
    },
    login: async (_: unknown, args: { username: string; password: string }, context: GraphQLContext) => {
      const user = await context.users.authenticate(args.username, args.password)
      if (!user) {
        throw new Error('Invalid username or password')
      }
      const token = context.sessions.createSession(user.id)
      return { token, user }
    },
    logout: (_: unknown, _args: unknown, context: GraphQLContext) => {
      if (context.authToken) {
        context.sessions.invalidate(context.authToken)
      }
      return true
    },
    createGame: (_: unknown, args: { name: string; seats: number; cardsPerPlayer: number }, context: GraphQLContext) => {
      const user = requireAuth(context)
      const { game, playerKey } = context.games.createGame({
        name: args.name,
        seats: args.seats,
        cardsPerPlayer: args.cardsPerPlayer,
        userId: user.id
      })
      return { playerKey, game: context.games.buildGameState(game, playerKey) }
    },
    joinGame: (_: unknown, args: { gameId: string; name: string }, context: GraphQLContext) => {
      const user = requireAuth(context)
      const { game, playerKey } = context.games.joinGame({ gameId: args.gameId, name: args.name, userId: user.id })
      return { playerKey, game: context.games.buildGameState(game, playerKey) }
    },
    startGame: (_: unknown, args: { gameId: string; playerKey: string }, context: GraphQLContext) => {
      requireAuth(context)
      const game = context.games.startGame({ gameId: args.gameId, playerKey: args.playerKey })
      return context.games.buildGameState(game, args.playerKey)
    },
    playCard: (_: unknown, args: { gameId: string; playerKey: string; cardIndex: number; color?: string | null }, context: GraphQLContext) => {
      requireAuth(context)
      let color: Color | undefined
      if (args.color) {
        const normalized = args.color.trim().toUpperCase()
        if (!COLORS.includes(normalized as Color)) {
          throw new Error('Invalid color selection')
        }
        color = normalized as Color
      }
      const game = context.games.playCard({
        gameId: args.gameId,
        playerKey: args.playerKey,
        cardIndex: args.cardIndex,
        color
      })
      return context.games.buildGameState(game, args.playerKey)
    },
    drawCard: (_: unknown, args: { gameId: string; playerKey: string }, context: GraphQLContext) => {
      requireAuth(context)
      const game = context.games.drawCard({ gameId: args.gameId, playerKey: args.playerKey })
      return context.games.buildGameState(game, args.playerKey)
    },
    sayUno: (_: unknown, args: { gameId: string; playerKey: string }, context: GraphQLContext) => {
      requireAuth(context)
      const game = context.games.sayUno({ gameId: args.gameId, playerKey: args.playerKey })
      return context.games.buildGameState(game, args.playerKey)
    },
    catchUno: (_: unknown, args: { gameId: string; playerKey: string; accusedSeat: number }, context: GraphQLContext) => {
      requireAuth(context)
      const game = context.games.catchUno({ gameId: args.gameId, playerKey: args.playerKey, accusedSeat: args.accusedSeat })
      return context.games.buildGameState(game, args.playerKey)
    },
    leaveGame: (_: unknown, args: { gameId: string; playerKey: string }, context: GraphQLContext) => {
      requireAuth(context)
      return context.games.leaveGame({ gameId: args.gameId, playerKey: args.playerKey })
    }
  },
  Subscription: {
    pendingGames: {
      subscribe: (_: unknown, __: unknown, context: GraphQLContext) => {
        return context.games.getPubSub().asyncIterator(PENDING_GAMES_TOPIC)
      },
      resolve: (payload: any, args: { playerKey?: string | null }, context: GraphQLContext) => {
        const gameId = payload?.pendingGames?.gameId as string | undefined
        if (!gameId) {
          throw new Error('Invalid pending game payload')
        }
        const game = context.games.getGame(gameId)
        if (!game) {
          return {
            id: gameId,
            code: '',
            status: 'COMPLETED',
            seats: 0,
            cardsPerPlayer: 0,
            createdAt: new Date().toISOString(),
            players: []
          }
        }
        return context.games.buildPendingGame(game, args.playerKey ?? null)
      }
    },
    gameUpdates: {
      subscribe: withFilter(
        (_: unknown, __: unknown, context: GraphQLContext) => {
          return context.games.getPubSub().asyncIterator(GAME_UPDATED_TOPIC)
        },
        (payload: any, variables: { gameId: string }) => {
          const gameId = payload?.gameUpdates?.gameId
          if (!gameId || gameId !== variables.gameId) return false
          return true
        }
      ),
      resolve: (_payload: any, args: { gameId: string; playerKey?: string | null }, context: GraphQLContext) => {
        const game = context.games.getGame(args.gameId)
        if (!game) {
          throw new Error('Game not found')
        }
        return context.games.buildGameState(game, args.playerKey ?? null)
      }
    }
  }
}

export const schema = makeExecutableSchema({ typeDefs, resolvers })
export { typeDefs, resolvers }
