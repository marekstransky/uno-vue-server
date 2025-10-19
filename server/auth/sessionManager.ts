import { v4 as uuid } from 'uuid'

interface SessionRecord {
  token: string
  userId: string
  createdAt: string
}

export class SessionManager {
  private readonly sessions = new Map<string, SessionRecord>()

  createSession(userId: string): string {
    const token = uuid()
    this.sessions.set(token, {
      token,
      userId,
      createdAt: new Date().toISOString()
    })
    return token
  }

  getUserId(token: string): string | null {
    const record = this.sessions.get(token)
    return record ? record.userId : null
  }

  invalidate(token: string): void {
    this.sessions.delete(token)
  }

  invalidateAllForUser(userId: string): void {
    for (const [token, record] of this.sessions.entries()) {
      if (record.userId === userId) {
        this.sessions.delete(token)
      }
    }
  }
}
