import type { Request } from 'express'
import type { Context as WsContext } from 'graphql-ws'
import type { GameManager } from './game/gameManager'
import type { UserRepository, PublicUser } from './data/userRepository'
import type { SessionManager } from './auth/sessionManager'

export interface GraphQLContext {
  games: GameManager
  users: UserRepository
  sessions: SessionManager
  currentUser: PublicUser | null
  authToken: string | null
}

const extractBearerToken = (value?: string | null): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim() || null
  }
  return trimmed
}

const resolveUser = (
  token: string | null,
  users: UserRepository,
  sessions: SessionManager
): { token: string | null; user: PublicUser | null } => {
  if (!token) {
    return { token: null, user: null }
  }
  const userId = sessions.getUserId(token)
  if (!userId) {
    return { token: null, user: null }
  }
  const user = users.getById(userId) ?? null
  if (!user) {
    sessions.invalidate(token)
    return { token: null, user: null }
  }
  return { token, user }
}

export const buildHttpContext = async ({
  req,
  games,
  users,
  sessions
}: {
  req: Request
  games: GameManager
  users: UserRepository
  sessions: SessionManager
}): Promise<GraphQLContext> => {
  const header = req.headers.authorization
  const raw = Array.isArray(header) ? header[0] : header
  const token = extractBearerToken(raw ?? null)
  const { user, token: resolvedToken } = resolveUser(token, users, sessions)
  return {
    games,
    users,
    sessions,
    currentUser: user,
    authToken: resolvedToken
  }
}

export const buildWsContext = async ({
  ctx,
  games,
  users,
  sessions
}: {
  ctx: WsContext
  games: GameManager
  users: UserRepository
  sessions: SessionManager
}): Promise<GraphQLContext> => {
  const params = ctx.connectionParams ?? {}
  let token: string | null = null
  if (typeof params === 'object' && params !== null) {
    const authHeader = (params as Record<string, unknown>).Authorization ?? (params as Record<string, unknown>).authorization
    if (typeof authHeader === 'string') {
      token = extractBearerToken(authHeader)
    } else if (typeof authHeader === 'object' && authHeader && 'token' in authHeader) {
      const candidate = (authHeader as { token?: unknown }).token
      if (typeof candidate === 'string') {
        token = extractBearerToken(candidate)
      }
    }
  }
  const { user, token: resolvedToken } = resolveUser(token, users, sessions)
  return {
    games,
    users,
    sessions,
    currentUser: user,
    authToken: resolvedToken
  }
}
