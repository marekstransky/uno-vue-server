import { defineStore } from 'pinia'

export type PlayerKind = 'human' | 'bot'

export interface BotConfig {
  name: string
  forgetUnoChance: number
  catchUnoChance: number
}

export interface MatchConfig {
  humanName: string
  botConfigs: BotConfig[]
  cardsPerPlayer: number
}

export interface RoundResultSummary {
  winnerIndex: number
  winnerName: string
  pointsAwarded: number
  players: Array<{
    name: string
    kind: PlayerKind
    remainingCards: number
    cards?: string[]
  }>
}

export const useMatchStore = defineStore('match', {
  state: () => ({
    config: undefined as MatchConfig | undefined,
    result: undefined as RoundResultSummary | undefined
  }),
  actions: {
    setConfig(config: MatchConfig) {
      this.config = config
      this.result = undefined
    },
    setResult(result: RoundResultSummary) {
      this.result = result
    },
    reset() {
      this.config = undefined
      this.result = undefined
    }
  }
})
