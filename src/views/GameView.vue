<template>
  <template v-if="roundView">
    <section class="game-wrapper">
    <aside class="players-panel">
      <article
        v-for="player in roundView.players"
        :key="player.index"
        class="player-card"
        :class="{
          current: player.isCurrent,
          human: player.index === humanIndex,
          danger: player.cardCount === 1
        }"
      >
        <header>
          <h3>{{ player.name }}</h3>
          <span v-if="player.isCurrent" class="turn-indicator">{{ directionSymbol }}</span>
        </header>
        <div class="card-count">
          <span>{{ player.cardCount }} card{{ player.cardCount === 1 ? '' : 's' }}</span>
          <button
            v-if="catchTarget === player.index && player.index !== humanIndex"
            class="catch-button"
            @click="callOutUno(player.index)"
          >
            Call UNO!
          </button>
        </div>
      </article>
    </aside>

    <div class="board-area">
      <div class="center-area">
        <div class="draw-stack" :class="{ disabled: !canDraw }" @click="drawCard">
          <UnoCard :card="faceDownCard" face-down />
          <span>Draw ({{ roundView.drawPileSize }})</span>
        </div>
        <div class="discard-stack">
          <UnoCard v-if="roundView.topCard" :card="roundView.topCard" />
          <span v-if="roundView.currentColor" class="color-chip" :class="roundView.currentColor.toLowerCase()">
            {{ roundView.currentColor }}
          </span>
        </div>
      </div>

      <div class="action-bar">
        <button class="uno-button" :class="{ armed: readyForUno }" :disabled="!canArmUno" @click="armUno">
          {{ readyForUno ? 'UNO armed' : 'Say UNO' }}
        </button>
        <button class="draw-button" :disabled="!canDraw" @click="drawCard">Draw card</button>
        <div class="status-message" v-if="stateMessage">{{ stateMessage }}</div>
      </div>

      <div class="hand-row">
        <UnoCard
          v-for="(card, index) in roundView.humanHand"
          :key="`${index}-${card.type}-${card.type === 'NUMBERED' ? card.number : ''}`"
          :card="card"
          :clickable="canPlayCard(index)"
          :highlight="selectingColorIndex === index"
          @select="handleCardSelect(index)"
        />
      </div>
    </div>

      <aside class="log-panel">
        <h3>Events</h3>
        <ul>
          <li v-for="entry in logs" :key="entry.id">{{ entry.text }}</li>
        </ul>
      </aside>
    </section>

    <Transition name="overlay">
      <div v-if="selectingColorIndex !== null" class="color-overlay">
        <div class="color-dialog">
          <h3>Pick a color</h3>
          <div class="color-options">
            <button
              v-for="color in colors"
              :key="color"
              :class="['color-chip', color.toLowerCase()]"
              @click="confirmColor(color)"
            >
              {{ color }}
            </button>
          </div>
          <button class="cancel-button" @click="cancelColorSelection">Cancel</button>
        </div>
      </div>
    </Transition>
  </template>

  <section v-else class="loading">
    <span>Shuffling deck…</span>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import UnoCard from '@/components/UnoCard.vue'
import { useMatchStore } from '@/stores/matchStore'
import { colors as allColors, type Card, type Color } from '@model/deck'
import { serializeCard, type SerializedCard } from '@model/cards'
import { createRound, type Round } from '@model/round'
import { standardShuffler } from '@utils/random_utils'
import { BotController } from '@bots/botController'
import type { BotActionOption, BotPlayOption, TurnContext } from '@bots/botMessages'

interface PlayerSummary {
  index: number
  name: string
  kind: 'human' | 'bot'
  cardCount: number
  isCurrent: boolean
}

interface RoundViewSnapshot {
  players: PlayerSummary[]
  humanHand: SerializedCard[]
  topCard?: SerializedCard
  currentColor?: Color
  drawPileSize: number
  discardPileSize: number
  currentPlayer: number | undefined
  direction: 'clockwise' | 'counterclockwise'
}

interface LogEntry {
  id: number
  text: string
}

const router = useRouter()
const store = useMatchStore()

if (!store.config) {
  router.replace({ name: 'setup' })
}

const config = store.config

const players = config
  ? [
      { index: 0, name: config.humanName, kind: 'human' as const },
      ...config.botConfigs.map((bot, idx) => ({
        index: idx + 1,
        name: bot.name,
        kind: 'bot' as const,
        forgetUnoChance: bot.forgetUnoChance,
        catchUnoChance: bot.catchUnoChance
      }))
    ]
  : []

const humanIndex = 0

const roundRef = ref<Round | null>(null)
const roundView = ref<RoundViewSnapshot | null>(null)
const logs = reactive<LogEntry[]>([])
const readyForUno = ref(false)
const selectingColorIndex = ref<number | null>(null)
const stateMessage = ref<string | null>(null)
const catchTarget = ref<number | null>(null)

let messageTimer: ReturnType<typeof setTimeout> | undefined
let catchTimer: ReturnType<typeof setTimeout> | undefined
let logCounter = 0
let botTurnScheduled = false
const botControllers = new Map<number, BotController>()

const colors = allColors
const faceDownCard: SerializedCard = { type: 'WILD' }

const isColoredCard = (card: Card): card is Card & { color: Color } => card.type !== 'WILD' && card.type !== 'WILD DRAW'

const directionSymbol = computed(() => (roundView.value?.direction === 'clockwise' ? '⟳' : '⟲'))

const setMessage = (message: string, duration = 2600) => {
  stateMessage.value = message
  if (messageTimer) {
    clearTimeout(messageTimer)
    messageTimer = undefined
  }
  if (duration > 0) {
    messageTimer = setTimeout(() => {
      stateMessage.value = null
    }, duration)
  }
}

const addLog = (text: string) => {
  logs.unshift({ id: ++logCounter, text })
  if (logs.length > 16) logs.pop()
}

const buildRoundView = () => {
  if (!roundRef.value || !config) return
  const round = roundRef.value
  const memento = round.toMemento()
  const topCard = memento.discardPile[0] ? serializeCard(memento.discardPile[0] as Card) : undefined
  const playersView: PlayerSummary[] = memento.players.map((name: string, index: number) => ({
    index,
    name: players[index]?.name ?? name,
    kind: players[index]?.kind ?? 'bot',
    cardCount: round.playerHand(index).length,
    isCurrent: memento.playerInTurn === index
  }))

  roundView.value = {
    players: playersView,
  humanHand: round.playerHand(humanIndex).map((card: Card) => serializeCard(card)),
    topCard,
    currentColor: memento.currentColor,
    drawPileSize: round.drawPile().size,
    discardPileSize: round.discardPile().size,
    currentPlayer: memento.playerInTurn,
    direction: memento.currentDirection
  }
}

const describeCard = (card: SerializedCard, chosenColor?: Color) => {
  switch (card.type) {
    case 'NUMBERED':
      return `${card.color} ${card.number}`
    case 'SKIP':
    case 'REVERSE':
    case 'DRAW':
      return `${card.color} ${card.type}`
    case 'WILD':
      return chosenColor ? `WILD (${chosenColor})` : 'WILD'
    case 'WILD DRAW':
      return chosenColor ? `WILD DRAW (${chosenColor})` : 'WILD DRAW'
    default:
      return 'Unknown card'
  }
}

const updateRoundView = () => {
  buildRoundView()
  readyForUno.value = false
}

const openCatchWindow = (accusedIndex: number) => {
  catchTarget.value = accusedIndex
  if (catchTimer) clearTimeout(catchTimer)
  catchTimer = setTimeout(() => {
    catchTarget.value = null
  }, 4500)
}

const closeCatchWindow = () => {
  catchTarget.value = null
  if (catchTimer) {
    clearTimeout(catchTimer)
    catchTimer = undefined
  }
}

const callOutUno = (accusedIndex: number) => {
  if (!roundRef.value) return
  if (roundRef.value.catchUnoFailure({ accuser: humanIndex, accused: accusedIndex })) {
    addLog(`${players[humanIndex].name} calls UNO on ${players[accusedIndex].name}! +4 cards`)
    updateRoundView()
  } else {
    setMessage('Too late to call UNO!')
  }
  closeCatchWindow()
}

const canDraw = computed(() => {
  if (!roundRef.value) return false
  if (roundRef.value.playerInTurn() !== humanIndex) return false
  if (!roundRef.value.canDraw()) return false
  return !roundRef.value.canPlayAny()
})

const canArmUno = computed(() => {
  if (!roundRef.value) return false
  if (roundRef.value.playerInTurn() !== humanIndex) return false
  return roundRef.value.playerHand(humanIndex).length === 2
})

const canPlayCard = (index: number) => {
  if (!roundRef.value) return false
  if (roundRef.value.playerInTurn() !== humanIndex) return false
  return roundRef.value.canPlay(index)
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const ensureBotTurn = () => {
  if (!roundRef.value) return
  if (roundRef.value.playerInTurn() === undefined) return
  const current = roundRef.value.playerInTurn()
  if (current === undefined) return
  const player = players[current]
  if (!player || player.kind !== 'bot') return
  if (botTurnScheduled) return
  botTurnScheduled = true
  setTimeout(async () => {
    await handleBotTurn(current)
    botTurnScheduled = false
    await nextTick()
    ensureBotTurn()
  }, 650)
}

const buildBotContext = (botIndex: number): Omit<TurnContext, 'requestId'> => {
  const round = roundRef.value!
  const memento = round.toMemento()
  const hand = round.playerHand(botIndex)
  const handSerialized = hand.map((card: Card) => serializeCard(card))
  const actions: BotActionOption[] = []

  hand.forEach((card: Card, index: number) => {
    if (round.canPlay(index)) {
      actions.push({
        type: 'play',
        cardIndex: index,
        card: serializeCard(card),
        resultingHandSize: hand.length - 1,
        requiresColor: card.type === 'WILD' || card.type === 'WILD DRAW'
      })
    }
  })

  if (actions.length === 0 && round.canDraw()) {
    actions.push({ type: 'draw' })
  }

  const handColorCounts = allColors.reduce<Record<Color, number>>((acc, color) => {
    acc[color] = hand.filter((card: Card) => isColoredCard(card) && card.color === color).length
    return acc
  }, { RED: 0, GREEN: 0, BLUE: 0, YELLOW: 0 })

  const topCard = memento.discardPile[0] ? serializeCard(memento.discardPile[0] as Card) : undefined

  return {
    actions,
    hand: handSerialized,
    handColorCounts,
    topCard,
    currentColor: memento.currentColor,
    players: players.map((player, index) => ({
      index,
      name: player.name,
      cardCount: round.playerHand(index).length
    }))
  }
}

const handleUnoFailure = async (accusedIndex: number) => {
  if (!roundRef.value) return
  const accused = players[accusedIndex]
  addLog(`${accused.name} forgot to say UNO!`)
  const accusedIsHuman = accusedIndex === humanIndex
  if (!accusedIsHuman) openCatchWindow(accusedIndex)
  const delay = accusedIsHuman ? 350 : 900
  await wait(delay)

  for (const [index, controller] of botControllers.entries()) {
    if (index === accusedIndex) continue
    const response = await controller.considerUnoCall({ accusedIndex })
    if (response.shouldCallOut) {
      const success = roundRef.value.catchUnoFailure({ accuser: index, accused: accusedIndex })
      if (success) {
        addLog(`${players[index].name} calls UNO on ${accused.name}. +4 cards!`)
        updateRoundView()
        closeCatchWindow()
        return
      }
    }
  }
}

const afterAction = async (actorIndex: number, cardDescription: string | null, saidUno: boolean) => {
  updateRoundView()
  if (cardDescription) addLog(cardDescription)

  if (roundRef.value?.hasEnded()) {
    finalizeRound()
    return
  }

  const actorHandSize = roundRef.value?.playerHand(actorIndex).length ?? 0
  if (actorHandSize === 1 && !saidUno) {
    await handleUnoFailure(actorIndex)
  } else {
    closeCatchWindow()
  }

  await nextTick()
  ensureBotTurn()
}

const armUno = () => {
  if (!roundRef.value) return
  if (roundRef.value.playerInTurn() !== humanIndex) return
  roundRef.value.sayUno(humanIndex)
  readyForUno.value = true
  setMessage('UNO armed! Play your card now.', 1800)
}

const playCard = async (index: number, color?: Color) => {
  if (!roundRef.value) return
  const hand = roundRef.value.playerHand(humanIndex)
  const card = hand[index]
  const saidUno = readyForUno.value
  try {
    roundRef.value.play(index, color)
    selectingColorIndex.value = null
    readyForUno.value = false
    const description = `${players[humanIndex].name} plays ${describeCard(serializeCard(card), color)}`
    await afterAction(humanIndex, description, saidUno)
  } catch (error) {
    setMessage((error as Error).message)
  }
}

const handleCardSelect = (index: number) => {
  if (!canPlayCard(index) || !roundRef.value) return
  const card = roundRef.value.playerHand(humanIndex)[index]
  if (card.type === 'WILD' || card.type === 'WILD DRAW') {
    selectingColorIndex.value = index
    return
  }
  playCard(index)
}

const confirmColor = (color: Color) => {
  if (selectingColorIndex.value === null) return
  playCard(selectingColorIndex.value, color)
}

const cancelColorSelection = () => {
  selectingColorIndex.value = null
}

const drawCard = async () => {
  if (!roundRef.value || !canDraw.value) {
    setMessage('You need to play if you can!')
    return
  }
  try {
    const card = roundRef.value.draw()
    readyForUno.value = false
    const description = `${players[humanIndex].name} draws ${describeCard(serializeCard(card))}`
    await afterAction(humanIndex, description, false)
  } catch (error) {
    setMessage((error as Error).message)
  }
}

const handleBotTurn = async (botIndex: number) => {
  if (!roundRef.value) return
  const controller = botControllers.get(botIndex)
  if (!controller) return
  const context = buildBotContext(botIndex)
  const decision = await controller.takeTurn(context)
  await wait(decision.delayMs)
  const option = context.actions.find(
    action => action.type === 'play' && decision.action.type === 'play' && action.cardIndex === decision.action.cardIndex
  ) as BotPlayOption | undefined
  const saidUno = decision.sayUno
  if (decision.sayUno) {
    roundRef.value?.sayUno(botIndex)
  }

  if (decision.action.type === 'play') {
    try {
      roundRef.value?.play(decision.action.cardIndex, decision.action.color)
      const description = option
        ? `${players[botIndex].name} plays ${describeCard(option.card, decision.action.color)}`
        : `${players[botIndex].name} plays a card`
      await afterAction(botIndex, description, saidUno)
    } catch (error) {
      addLog(`${players[botIndex].name} hesitated.`)
    }
  } else {
    try {
      const drawn = roundRef.value?.draw()
      if (drawn) {
        const description = `${players[botIndex].name} draws a card`
        await afterAction(botIndex, description, false)
      }
    } catch (error) {
      addLog(`${players[botIndex].name} wanted to draw but ${String((error as Error).message ?? 'could not')}`)
    }
  }
}

const finalizeRound = () => {
  if (!roundRef.value) return
  const winnerIndex = roundRef.value.winner()
  const score = roundRef.value.score() ?? 0
  const summary = {
    winnerIndex: winnerIndex ?? 0,
    winnerName: winnerIndex !== undefined ? players[winnerIndex].name : players[0].name,
    pointsAwarded: score,
    players: players.map((player, index) => ({
      name: player.name,
      kind: player.kind,
      remainingCards: roundRef.value?.playerHand(index).length ?? 0,
  cards: roundRef.value?.playerHand(index).map((card: Card) => describeCard(serializeCard(card))) ?? []
    }))
  }
  store.setResult(summary)
  terminateBots()
  router.push({ name: 'result' })
}

const terminateBots = () => {
  botControllers.forEach(controller => controller.terminate())
  botControllers.clear()
}

onMounted(() => {
  if (!config) return
  const dealer = Math.floor(Math.random() * players.length)
  roundRef.value = createRound({
    players: players.map(player => player.name),
    dealer,
    shuffler: standardShuffler,
    cardsPerPlayer: config.cardsPerPlayer
  })
  roundRef.value.onEnd(() => finalizeRound())
  players.forEach(player => {
    if (player.kind === 'bot') {
      const controller = new BotController({
        index: player.index,
        name: player.name,
        forgetUnoChance: player.forgetUnoChance ?? 0.3,
        catchUnoChance: player.catchUnoChance ?? 0.5
      })
      botControllers.set(player.index, controller)
    }
  })
  addLog('Round starts! Good luck.')
  updateRoundView()
  ensureBotTurn()
})

onBeforeUnmount(() => {
  terminateBots()
  closeCatchWindow()
  if (messageTimer) {
    clearTimeout(messageTimer)
    messageTimer = undefined
  }
})
</script>

<style scoped>
.game-wrapper {
  display: grid;
  grid-template-columns: 260px 1fr 260px;
  gap: 1.5rem;
  width: 100%;
}

.players-panel,
.log-panel {
  background: rgba(15, 20, 33, 0.8);
  border-radius: 24px;
  padding: 1.5rem;
  backdrop-filter: blur(8px);
  display: grid;
  gap: 1rem;
  color: #f5f5f5;
}

.player-card {
  border-radius: 18px;
  padding: 1rem;
  background: rgba(24, 30, 46, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border 0.2s ease-in-out, transform 0.15s;
}

.player-card.current {
  border-color: rgba(255, 221, 87, 0.8);
  transform: translateX(6px);
}

.player-card.human {
  border-color: rgba(0, 174, 239, 0.35);
}

.player-card.danger {
  border-color: rgba(255, 70, 86, 0.8);
}

.player-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.turn-indicator {
  font-size: 1.4rem;
  color: rgba(255, 221, 87, 0.9);
}

.card-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
}

.catch-button {
  border: none;
  background: rgba(255, 70, 86, 0.85);
  color: #fff;
  padding: 0.4rem 0.7rem;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.8rem;
  letter-spacing: 0.05rem;
}

.board-area {
  background: rgba(17, 22, 35, 0.82);
  border-radius: 28px;
  padding: 1.8rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #f5f5f5;
  position: relative;
}

.center-area {
  display: flex;
  justify-content: center;
  gap: 3rem;
  align-items: center;
  margin-top: 1.2rem;
}

.draw-stack,
.discard-stack {
  display: grid;
  place-items: center;
  gap: 0.6rem;
  text-align: center;
  cursor: pointer;
}

.draw-stack.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.color-chip {
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.1rem;
}

.color-chip.red { background: rgba(255, 70, 86, 0.7); }
.color-chip.blue { background: rgba(0, 153, 255, 0.7); }
.color-chip.green { background: rgba(76, 217, 100, 0.7); color: #0e1b0f; }
.color-chip.yellow { background: rgba(255, 221, 87, 0.9); color: #32260b; }

.action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.uno-button,
.draw-button {
  border: none;
  border-radius: 999px;
  padding: 0.75rem 1.4rem;
  font-weight: 600;
  letter-spacing: 0.08rem;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.15s ease-in-out, box-shadow 0.2s;
}

.uno-button {
  background: linear-gradient(120deg, #ff4656 0%, #ff9966 100%);
  color: #fff;
}

.uno-button.armed {
  box-shadow: 0 0 18px rgba(255, 70, 86, 0.65);
}

.uno-button:disabled,
.draw-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.draw-button {
  background: rgba(0, 153, 255, 0.75);
  color: #f5f5f5;
}

.status-message {
  font-size: 0.85rem;
  color: rgba(255, 221, 87, 0.95);
}

.hand-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 2rem;
}

.log-panel h3 {
  margin: 0;
  font-size: 1.1rem;
  letter-spacing: 0.08rem;
  text-transform: uppercase;
}

.log-panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
  font-size: 0.9rem;
}

.color-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  z-index: 100;
}

.color-dialog {
  padding: 2rem;
  border-radius: 24px;
  background: rgba(20, 25, 38, 0.95);
  min-width: 320px;
  text-align: center;
  display: grid;
  gap: 1.2rem;
  color: #f5f5f5;
}

.color-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.8rem;
}

.color-chip {
  border: none;
  padding: 0.8rem 1rem;
  border-radius: 16px;
  font-weight: 600;
  cursor: pointer;
  color: #0f1320;
}

.color-chip.red { color: #fff; }
.color-chip.blue { color: #fff; }
.color-chip.green { color: #0f1a11; }
.color-chip.yellow { color: #332400; }

.cancel-button {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}

.loading {
  margin: auto;
  color: #f5f5f5;
  font-size: 1.2rem;
  letter-spacing: 0.2rem;
  text-transform: uppercase;
}

@media (max-width: 1200px) {
  .game-wrapper {
    grid-template-columns: 1fr;
  }

  .players-panel,
  .log-panel {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    grid-auto-rows: minmax(120px, auto);
  }
}
</style>
