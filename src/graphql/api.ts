import { apolloClient } from './client'
import {
  CATCH_UNO_MUTATION,
  CREATE_GAME_MUTATION,
  DRAW_CARD_MUTATION,
  GAME_QUERY,
  GAME_UPDATES_SUBSCRIPTION,
  JOIN_GAME_MUTATION,
  LEAVE_GAME_MUTATION,
  LOGIN_MUTATION,
  LOGOUT_MUTATION,
  ME_QUERY,
  PENDING_GAMES_QUERY,
  PENDING_GAMES_SUBSCRIPTION,
  PLAY_CARD_MUTATION,
  REGISTER_MUTATION,
  SAY_UNO_MUTATION,
  START_GAME_MUTATION
} from './operations'
import type { AuthPayloadDto, GameStateDto, JoinGamePayloadDto, PendingGameDto, UserDto } from '@/types/api'

export async function registerUser(username: string, password: string): Promise<AuthPayloadDto> {
  const { data } = await apolloClient.mutate<{ register: AuthPayloadDto }>({
    mutation: REGISTER_MUTATION,
    variables: { username, password }
  })
  if (!data?.register) {
    throw new Error('Registration failed')
  }
  return data.register
}

export async function loginUser(username: string, password: string): Promise<AuthPayloadDto> {
  const { data } = await apolloClient.mutate<{ login: AuthPayloadDto }>({
    mutation: LOGIN_MUTATION,
    variables: { username, password }
  })
  if (!data?.login) {
    throw new Error('Login failed')
  }
  return data.login
}

export async function logoutUser(): Promise<boolean> {
  const { data } = await apolloClient.mutate<{ logout: boolean }>({
    mutation: LOGOUT_MUTATION
  })
  return data?.logout ?? false
}

export async function fetchCurrentUser(): Promise<UserDto | null> {
  const { data } = await apolloClient.query<{ me: UserDto | null }>({
    query: ME_QUERY,
    fetchPolicy: 'network-only'
  })
  return data.me ?? null
}

export async function fetchPendingGames(playerKey?: string | null): Promise<PendingGameDto[]> {
  const { data } = await apolloClient.query<{ pendingGames: PendingGameDto[] }>({
    query: PENDING_GAMES_QUERY,
    variables: { playerKey: playerKey ?? null },
    fetchPolicy: 'network-only'
  })
  return data.pendingGames
}

export async function createGame(name: string, seats: number, cardsPerPlayer: number): Promise<JoinGamePayloadDto> {
  const { data } = await apolloClient.mutate<{ createGame: JoinGamePayloadDto }>({
    mutation: CREATE_GAME_MUTATION,
    variables: { name, seats, cardsPerPlayer }
  })
  if (!data?.createGame) {
    throw new Error('Failed to create game')
  }
  return data.createGame
}

export async function joinGame(gameId: string, name: string): Promise<JoinGamePayloadDto> {
  const { data } = await apolloClient.mutate<{ joinGame: JoinGamePayloadDto }>({
    mutation: JOIN_GAME_MUTATION,
    variables: { gameId, name }
  })
  if (!data?.joinGame) {
    throw new Error('Failed to join game')
  }
  return data.joinGame
}

export async function startGame(gameId: string, playerKey: string): Promise<GameStateDto> {
  const { data } = await apolloClient.mutate<{ startGame: GameStateDto }>({
    mutation: START_GAME_MUTATION,
    variables: { gameId, playerKey }
  })
  if (!data?.startGame) {
    throw new Error('Failed to start game')
  }
  return data.startGame
}

export async function playCard(gameId: string, playerKey: string, cardIndex: number, color?: string): Promise<GameStateDto> {
  const { data } = await apolloClient.mutate<{ playCard: GameStateDto }>({
    mutation: PLAY_CARD_MUTATION,
    variables: { gameId, playerKey, cardIndex, color }
  })
  if (!data?.playCard) {
    throw new Error('Play card failed')
  }
  return data.playCard
}

export async function drawCard(gameId: string, playerKey: string): Promise<GameStateDto> {
  const { data } = await apolloClient.mutate<{ drawCard: GameStateDto }>({
    mutation: DRAW_CARD_MUTATION,
    variables: { gameId, playerKey }
  })
  if (!data?.drawCard) {
    throw new Error('Draw card failed')
  }
  return data.drawCard
}

export async function sayUno(gameId: string, playerKey: string): Promise<GameStateDto> {
  const { data } = await apolloClient.mutate<{ sayUno: GameStateDto }>({
    mutation: SAY_UNO_MUTATION,
    variables: { gameId, playerKey }
  })
  if (!data?.sayUno) {
    throw new Error('Say UNO failed')
  }
  return data.sayUno
}

export async function catchUno(gameId: string, playerKey: string, accusedSeat: number): Promise<GameStateDto> {
  const { data } = await apolloClient.mutate<{ catchUno: GameStateDto }>({
    mutation: CATCH_UNO_MUTATION,
    variables: { gameId, playerKey, accusedSeat }
  })
  if (!data?.catchUno) {
    throw new Error('Catch UNO failed')
  }
  return data.catchUno
}

export async function leaveGame(gameId: string, playerKey: string): Promise<boolean> {
  const { data } = await apolloClient.mutate<{ leaveGame: boolean }>({
    mutation: LEAVE_GAME_MUTATION,
    variables: { gameId, playerKey }
  })
  return data?.leaveGame ?? false
}

export async function fetchGame(gameId: string, playerKey?: string | null): Promise<GameStateDto | null> {
  const { data } = await apolloClient.query<{ game: GameStateDto | null }>({
    query: GAME_QUERY,
    variables: { id: gameId, playerKey: playerKey ?? null },
    fetchPolicy: 'network-only'
  })
  return data.game ?? null
}

export const subscribePendingGames = (playerKey?: string | null) =>
  apolloClient.subscribe<{ pendingGames: PendingGameDto }>({
    query: PENDING_GAMES_SUBSCRIPTION,
    variables: { playerKey: playerKey ?? null }
  })

export const subscribeGameUpdates = (gameId: string, playerKey?: string | null) =>
  apolloClient.subscribe<{ gameUpdates: GameStateDto }>({
    query: GAME_UPDATES_SUBSCRIPTION,
    variables: { gameId, playerKey: playerKey ?? null }
  })
