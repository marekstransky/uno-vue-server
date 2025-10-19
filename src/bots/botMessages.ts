import type { SerializedCard } from '@model/cards'
import type { Color } from '@model/deck'

export interface BotIdentity {
  index: number
  name: string
  forgetUnoChance: number
  catchUnoChance: number
}

export interface BotPlayOption {
  type: 'play'
  cardIndex: number
  card: SerializedCard
  resultingHandSize: number
  requiresColor: boolean
}

export interface BotDrawOption {
  type: 'draw'
}

export type BotActionOption = BotPlayOption | BotDrawOption

export interface TurnContext {
  requestId: number
  actions: BotActionOption[]
  hand: SerializedCard[]
  handColorCounts: Record<Color, number>
  topCard: SerializedCard | undefined
  currentColor: Color | undefined
  players: Array<{ index: number; name: string; cardCount: number }>
}

export interface BotPlayDecision {
  type: 'play'
  cardIndex: number
  color?: Color
}

export interface BotDrawDecision {
  type: 'draw'
}

export type BotActionDecision = BotPlayDecision | BotDrawDecision

export interface BotTurnDecision {
  requestId: number
  decision: {
    action: BotActionDecision
    sayUno: boolean
    delayMs: number
  }
}

export interface UnoCheckRequest {
  requestId: number
  accusedIndex: number
}

export interface UnoCheckResponse {
  requestId: number
  shouldCallOut: boolean
}

export type BotInboundMessage =
  | { kind: 'init'; identity: BotIdentity }
  | { kind: 'turn'; context: TurnContext }
  | { kind: 'uno-check'; context: UnoCheckRequest }

export type BotOutboundMessage =
  | { kind: 'ready'; index: number }
  | { kind: 'decision'; payload: BotTurnDecision }
  | { kind: 'uno-check-result'; payload: UnoCheckResponse }
