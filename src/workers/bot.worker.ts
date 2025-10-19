/// <reference lib="webworker" />

import type { Color } from '@model/deck'
import type {
  BotInboundMessage,
  BotOutboundMessage,
  BotIdentity,
  TurnContext,
  BotPlayOption,
  BotTurnDecision,
  UnoCheckRequest
} from '@bots/botMessages'

const COLORS: Color[] = ['RED', 'GREEN', 'BLUE', 'YELLOW']

let identity: BotIdentity | undefined

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

const post = (message: BotOutboundMessage) => ctx.postMessage(message)

const randomDelay = () => 550 + Math.random() * 900

const weights: Record<string, number> = {
  NUMBERED: 2,
  SKIP: 2.5,
  REVERSE: 2,
  DRAW: 3,
  WILD: 1.5,
  'WILD DRAW': 4
}

const scoreOption = (option: BotPlayOption, context: TurnContext) => {
  let score = weights[option.card.type] ?? 1
  const topType = context.topCard?.type
  const currentColor = context.currentColor

  if (topType && option.card.type === topType) score += 1.5
  if ('color' in option.card && currentColor && option.card.color === currentColor) score += 2.5
  if (option.card.type === 'NUMBERED') score += 0.5
  if (option.resultingHandSize === 1) score += 1
  return score
}

const pickWildColor = (context: TurnContext) => {
  let bestColor: Color = COLORS[Math.floor(Math.random() * COLORS.length)]
  let bestScore = -Infinity
  for (const color of COLORS) {
    const score = context.handColorCounts[color] ?? 0
    if (score > bestScore) {
      bestColor = color
      bestScore = score
    }
  }
  return bestColor
}

const chooseAction = (context: TurnContext): BotTurnDecision['decision'] => {
  if (!identity) {
    throw new Error('Bot identity not initialised')
  }

  const playable = context.actions.filter((a): a is BotPlayOption => a.type === 'play')
  const drawOption = context.actions.find(a => a.type === 'draw')

  if (drawOption && (playable.length === 0 || Math.random() < 0.08)) {
    return {
      action: { type: 'draw' },
      sayUno: false,
      delayMs: randomDelay()
    }
  }

  if (playable.length === 0 && drawOption) {
    return {
      action: { type: 'draw' },
      sayUno: false,
      delayMs: randomDelay()
    }
  }

  if (playable.length === 0) {
    // should not happen, but avoid crash
    return {
      action: { type: 'draw' },
      sayUno: false,
      delayMs: randomDelay()
    }
  }

  const sorted = playable.slice().sort((a, b) => {
    const diff = scoreOption(b, context) - scoreOption(a, context)
    if (diff === 0) return Math.random() - 0.5
    return diff
  })

  const chosen = sorted[0]
  const sayUno = chosen.resultingHandSize === 1 && Math.random() > identity.forgetUnoChance
  const delayMs = randomDelay()

  if (chosen.requiresColor) {
    const color = pickWildColor(context)
    return {
      action: { type: 'play', cardIndex: chosen.cardIndex, color },
      sayUno,
      delayMs
    }
  }

  return {
    action: { type: 'play', cardIndex: chosen.cardIndex },
    sayUno,
    delayMs
  }
}

const handleTurn = (context: TurnContext) => {
  const decision = chooseAction(context)
  post({ kind: 'decision', payload: { requestId: context.requestId, decision } })
}

const handleUnoCheck = (context: UnoCheckRequest) => {
  if (!identity) return
  const shouldCallOut = Math.random() < identity.catchUnoChance
  post({ kind: 'uno-check-result', payload: { requestId: context.requestId, shouldCallOut } })
}

ctx.onmessage = event => {
  const message = event.data as BotInboundMessage
  switch (message.kind) {
    case 'init':
      identity = message.identity
      post({ kind: 'ready', index: identity.index })
      break
    case 'turn':
      handleTurn(message.context)
      break
    case 'uno-check':
      handleUnoCheck(message.context)
      break
  }
}
