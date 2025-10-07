import { Shuffler } from '../utils/random_utils'
import { serializeCard, deserializeCard, ALL_TYPES } from './cards'

export type Color = 'BLUE' | 'GREEN' | 'RED' | 'YELLOW'
export type Type = 'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW' | 'WILD' | 'WILD DRAW'

export const colors: Color[] = ['BLUE', 'GREEN', 'RED', 'YELLOW']

export interface NumberedCard {
  type: 'NUMBERED'
  color: Color
  number: number
}

export interface ActionCard {
  type: 'SKIP' | 'REVERSE' | 'DRAW'
  color: Color
}

export interface WildCard {
  type: 'WILD' | 'WILD DRAW'
}

export type Card = NumberedCard | ActionCard | WildCard

export interface Deck {
  readonly size: number
  deal(): Card | undefined
  peek(): Card | undefined
  shuffle(shuffler: Shuffler<Card>): void
  filter(predicate: (card: Card) => boolean): Deck
  toMemento(): Record<string, string | number>[]
}

class DeckImpl implements Deck {
  public cards: Card[]

  constructor(cards: Card[]) {
    this.cards = [...cards]
  }

  get size(): number {
    return this.cards.length
  }

  deal(): Card | undefined {
    return this.cards.shift()
  }

  peek(): Card | undefined {
    return this.cards[0]
  }

  shuffle(shuffler: Shuffler<Card>): void {
    shuffler(this.cards)
  }

  filter(predicate: (card: Card) => boolean): Deck {
    return new DeckImpl(this.cards.filter(predicate))
  }

  toMemento(): Record<string, string | number>[] {
    return this.cards.map(c => serializeCard(c) as unknown as Record<string, string | number>)
  }
}

export function createInitialDeck(): Deck {
  const cards: Card[] = []

  for (const color of colors) {
    cards.push({ type: 'NUMBERED', color, number: 0 })
    
    for (let number = 1; number <= 9; number++) {
      cards.push({ type: 'NUMBERED', color, number })
      cards.push({ type: 'NUMBERED', color, number })
    }
  }

  for (const color of colors) {
    cards.push({ type: 'SKIP', color })
    cards.push({ type: 'SKIP', color })
    
    cards.push({ type: 'REVERSE', color })
    cards.push({ type: 'REVERSE', color })
    
    cards.push({ type: 'DRAW', color })
    cards.push({ type: 'DRAW', color })
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ type: 'WILD' })
    cards.push({ type: 'WILD DRAW' })
  }

  return new DeckImpl(cards)
}

export function createDeckFromMemento(mementoCards: Record<string, string | number>[]): Deck {
  const cards: Card[] = []

  for (const cardData of mementoCards) {
    const type = cardData.type as Type
    if (!ALL_TYPES.includes(type)) {
      throw new Error(`Invalid card type: ${type}`)
    }
    // Basic validation (retain existing semantics)
    if (type === 'NUMBERED') {
      if (cardData.color === undefined || cardData.number === undefined) {
        throw new Error('Numbered cards must have color and number')
      }
    } else if (type === 'SKIP' || type === 'REVERSE' || type === 'DRAW') {
      if (cardData.color === undefined) {
        throw new Error(`${type} cards must have color`)
      }
    }
    cards.push(deserializeCard(cardData as any))
  }

  return new DeckImpl(cards)
}

export function hasColor(card: Card, color: Color): boolean {
  return 'color' in card && card.color === color
}

export function hasNumber(card: Card, number: number): boolean {
  return card.type === 'NUMBERED' && card.number === number
}
