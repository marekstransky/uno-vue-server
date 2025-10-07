import { Card, Color, Type, NumberedCard, ActionCard, WildCard } from './deck'

export const NUMBER_TYPES = ['NUMBERED'] as const
export const ACTION_TYPES = ['SKIP', 'REVERSE', 'DRAW'] as const
export const WILD_TYPES = ['WILD', 'WILD DRAW'] as const
export const ALL_TYPES: Type[] = [...NUMBER_TYPES, ...ACTION_TYPES, ...WILD_TYPES]

export type ActionType = typeof ACTION_TYPES[number]
export type WildType = typeof WILD_TYPES[number]

export interface SerializedNumberedCard { type: 'NUMBERED'; color: Color; number: number }
export interface SerializedActionCard { type: ActionType; color: Color }
export interface SerializedWildCard { type: WildType }
export type SerializedCard = SerializedNumberedCard | SerializedActionCard | SerializedWildCard

export function isActionType(t: unknown): t is ActionType { return ACTION_TYPES.includes(t as ActionType) }
export function isWildType(t: unknown): t is WildType { return WILD_TYPES.includes(t as WildType) }
export function isType(t: unknown): t is Type { return ALL_TYPES.includes(t as Type) }

export function isNumberedCard(card: Card): card is NumberedCard { return card.type === 'NUMBERED' }
export function isActionCard(card: Card): card is ActionCard { return card.type === 'SKIP' || card.type === 'REVERSE' || card.type === 'DRAW' }
export function isWildCard(card: Card): card is WildCard { return card.type === 'WILD' || card.type === 'WILD DRAW' }

export function serializeCard(card: Card): SerializedCard {
  if (isNumberedCard(card)) return { type: 'NUMBERED', color: card.color, number: card.number }
  if (isActionCard(card)) return { type: card.type, color: card.color }
  return { type: card.type }
}

export function deserializeCard(data: SerializedCard): Card {
  switch (data.type) {
    case 'NUMBERED':
      return { type: 'NUMBERED', color: data.color, number: data.number }
    case 'SKIP':
    case 'REVERSE':
    case 'DRAW':
      return { type: data.type, color: data.color }
    case 'WILD':
    case 'WILD DRAW':
      return { type: data.type }
  }
}

export function cardScore(card: Card): number {
  switch (card.type) {
    case 'NUMBERED': return card.number
    case 'SKIP':
    case 'REVERSE':
    case 'DRAW': return 20
    case 'WILD':
    case 'WILD DRAW': return 50
  }
}

export function isColor(value: any, colors: readonly Color[]): value is Color {
  return colors.includes(value)
}
