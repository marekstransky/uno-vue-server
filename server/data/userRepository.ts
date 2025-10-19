import { promises as fs } from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import type { UserRecord, UserStatsRecord } from '../types'

const DEFAULT_STATS: UserStatsRecord = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalScore: 0
}

export interface PublicUser {
  id: string
  username: string
  createdAt: string
  stats: UserStatsRecord
}

export class UserRepository {
  private readonly filePath: string
  private readonly users = new Map<string, UserRecord>()
  private readonly usernameIndex = new Map<string, string>()

  constructor(baseDir: string) {
    this.filePath = path.join(baseDir, 'data', 'users.json')
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      if (!raw.trim()) return
      const parsed = JSON.parse(raw) as UserRecord[]
      parsed.forEach(record => {
        this.users.set(record.id, record)
        this.usernameIndex.set(record.username.toLowerCase(), record.id)
      })
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        await this.persist()
        return
      }
      throw error
    }
  }

  private async persist(): Promise<void> {
    const payload = JSON.stringify(Array.from(this.users.values()), null, 2)
    await fs.writeFile(this.filePath, payload, 'utf8')
  }

  private sanitize(record: UserRecord): PublicUser {
    return {
      id: record.id,
      username: record.username,
      createdAt: record.createdAt,
      stats: { ...record.stats }
    }
  }

  async register(username: string, password: string): Promise<PublicUser> {
    const normalized = username.trim().toLowerCase()
    if (!normalized) {
      throw new Error('Username is required')
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }
    if (this.usernameIndex.has(normalized)) {
      throw new Error('Username already exists')
    }

    const id = uuid()
    const passwordHash = await bcrypt.hash(password, 10)
    const now = new Date().toISOString()
    const record: UserRecord = {
      id,
      username: username.trim(),
      passwordHash,
      createdAt: now,
      stats: { ...DEFAULT_STATS }
    }

    this.users.set(id, record)
    this.usernameIndex.set(normalized, id)
    await this.persist()
    return this.sanitize(record)
  }

  async authenticate(username: string, password: string): Promise<PublicUser | null> {
    const normalized = username.trim().toLowerCase()
    const userId = this.usernameIndex.get(normalized)
    if (!userId) return null
    const record = this.users.get(userId)
    if (!record) return null
    const matches = await bcrypt.compare(password, record.passwordHash)
    if (!matches) return null
    return this.sanitize(record)
  }

  getById(id: string): PublicUser | undefined {
    const record = this.users.get(id)
    return record ? this.sanitize(record) : undefined
  }

  getRecord(id: string): UserRecord | undefined {
    return this.users.get(id)
  }

  async recordRoundResult(params: {
    participants: string[]
    winnerId?: string
    pointsAwarded: number
  }): Promise<void> {
    const { participants, winnerId, pointsAwarded } = params
    const updates: UserRecord[] = []
    participants.forEach(userId => {
      const record = this.users.get(userId)
      if (!record) return
      record.stats.gamesPlayed += 1
      if (userId === winnerId) {
        record.stats.gamesWon += 1
        record.stats.totalScore += pointsAwarded
      }
      updates.push(record)
    })
    if (updates.length > 0) {
      await this.persist()
    }
  }
}
