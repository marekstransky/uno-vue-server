import { v4 as uuid } from 'uuid'
import type { SessionRecord } from '../types'

export class SessionStore {
  private readonly sessions = new Map<string, SessionRecord>()

  create(userId: string): SessionRecord {
    const token = uuid()
    const session: SessionRecord = {
      token,
      userId,
      createdAt: new Date().toISOString()
    }
    this.sessions.set(token, session)
    return session
  }

  get(token: string | null | undefined): SessionRecord | undefined {
    if (!token) return undefined
    return this.sessions.get(token)
  }

  revoke(token: string): void {
    this.sessions.delete(token)
  }
}
