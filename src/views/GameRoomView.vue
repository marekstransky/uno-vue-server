<template>
  <section class="game-room" v-if="state">
    <header class="game-header">
      <div>
        <h2>Table {{ state.code }}</h2>
        <p>Status: <span :class="['status', state.status.toLowerCase()]">{{ state.status }}</span></p>
      </div>
      <div class="header-actions">
        <button type="button" class="secondary" @click="leave" :disabled="actionBusy || state.status === 'ACTIVE'">Leave</button>
      </div>
    </header>

    <section class="players">
      <article v-for="player in state.players" :key="player.seat" :class="['player-card', { current: player.isCurrentTurn, self: player.isSelf }]">
        <header>
          <h3>{{ player.name }}</h3>
          <span v-if="player.isCurrentTurn" class="turn">Turn</span>
        </header>
        <p class="details">
          {{ player.cardCount }} card{{ player.cardCount === 1 ? '' : 's' }}
          <span v-if="state.status !== 'PENDING'">· score {{ player.score }}</span>
        </p>
        <button
          v-if="player.cardCount === 1 && !player.isSelf && state.status === 'ACTIVE'"
          class="secondary"
          type="button"
          @click="callUno(player.seat)"
          :disabled="actionBusy"
        >
          Call UNO
        </button>
      </article>
    </section>

    <section v-if="state.status === 'PENDING'" class="pending-panel">
      <p>Waiting for players. You need at least two players to begin.</p>
      <button class="primary" type="button" @click="start" :disabled="!canStart || actionBusy">
        {{ actionBusy ? 'Starting…' : 'Start round' }}
      </button>
    </section>

    <section v-else class="board" v-if="round">
      <div class="board__center">
        <div class="draw" :class="{ disabled: !canDraw }" @click="draw">
          <UnoCard :card="faceDownCard" face-down />
          <span>Draw ({{ round.drawPileSize }})</span>
        </div>
        <div class="discard">
          <UnoCard v-if="topCard" :card="topCard" />
          <span v-if="round.discardColor" :class="['color-chip', round.discardColor.toLowerCase()]">{{ round.discardColor }}</span>
        </div>
      </div>

      <div class="board__actions">
  <button class="secondary" type="button" @click="handleSayUno" :disabled="!canSayUno || actionBusy">Say UNO</button>
        <p class="message" v-if="errorMessage">{{ errorMessage }}</p>
      </div>

      <div class="hand" v-if="hand.length">
        <UnoCard
          v-for="(card, index) in hand"
          :key="`${index}-${card.type}-${card.type === 'NUMBERED' ? card.number : ''}`"
          :card="card"
          :clickable="canPlay"
          @select="attemptPlay(index)"
        />
      </div>
      <p v-else class="empty-hand">You have no cards.</p>
    </section>

    <section class="log" v-if="state.events.length">
      <h3>Log</h3>
      <ul>
        <li v-for="event in [...state.events].reverse()" :key="event.id">{{ formatLog(event.message, event.createdAt) }}</li>
      </ul>
    </section>

    <Transition name="overlay">
      <div v-if="selectingColor" class="overlay">
        <div class="color-dialog">
          <h3>Pick a color</h3>
          <div class="choices">
            <button v-for="color in colors" :key="color" :class="['color-chip', color.toLowerCase()]" @click="confirmColor(color)">
              {{ color }}
            </button>
          </div>
          <button class="secondary" type="button" @click="cancelColor">Cancel</button>
        </div>
      </div>
    </Transition>

    <Transition name="overlay">
      <div v-if="showResults" class="overlay">
        <div class="results-dialog">
          <h3>Round Complete</h3>
          <p class="summary" v-if="winnerPlayer">🎉 {{ winnerPlayer.name }} wins the round!</p>
          <p class="summary" v-else>Round finished with no winner recorded.</p>
          <p v-if="finishedAt" class="timestamp">Finished {{ finishedAt }}</p>
          <ul class="scoreboard">
            <li v-for="player in rankedPlayers" :key="player.seat" :class="{ winner: winnerSeat === player.seat }">
              <span class="name">{{ player.name }}</span>&nbsp;
              <span class="score">{{ player.score }} pts</span>
            </li>
          </ul>
          <div class="results-actions">
            <button class="primary" type="button" @click="leave">Return to lobby</button>
            <button class="secondary" type="button" @click="acknowledgeResults">Stay at table</button>
          </div>
        </div>
      </div>
    </Transition>
  </section>

  <section v-else class="loader">
    <p v-if="loading">Loading game…</p>
    <p v-else>{{ errorMessage || 'Unable to load game' }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UnoCard from '@/components/UnoCard.vue'
import {
  catchUno as catchUnoMutation,
  drawCard as drawCardMutation,
  fetchGame,
  joinGame,
  playCard as playCardMutation,
  sayUno as sayUnoMutation,
  startGame as startGameMutation,
  subscribeGameUpdates,
  leaveGame as leaveGameMutation
} from '@/graphql/api'
import type { CardDto, GameStateDto } from '@/types/api'
import type { SerializedActionCard, SerializedCard, SerializedNumberedCard, SerializedWildCard } from '@/model/cards'
import { usePlayerStore } from '@/stores/userStore'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const gameId = computed(() => route.params.id as string)

const state = ref<GameStateDto | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const actionBusy = ref(false)
const selectingIndex = ref<number | null>(null)
const selectingColor = ref(false)
let subscription: { unsubscribe(): void } | null = null
const resultsAcknowledged = ref(false)

const colors = ['RED', 'GREEN', 'BLUE', 'YELLOW']
const faceDownCard: SerializedCard = { type: 'WILD' }

const requirePlayerKey = (): string | null => {
  const key = playerStore.playerKey
  if (!key) {
    errorMessage.value = 'Join the game before performing actions.'
    return null
  }
  return key
}

const loadState = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    let current: GameStateDto | null = null
    try {
      current = await fetchGame(gameId.value, playerStore.playerKey || null)
    } catch (err) {
      console.warn('Fetch game failed, attempting to join', err)
    }
    if (!current) {
      const name = playerStore.playerName.trim()
      if (!name) {
        throw new Error('Enter your name in the lobby before joining a game.')
      }
      const joined = await joinGame(gameId.value, name)
      playerStore.rememberIdentity(name, joined.playerKey)
      current = joined.game
    }
    if (!current) {
      throw new Error('Game not found')
    }
    state.value = current
  } catch (err: any) {
    errorMessage.value = err?.message ?? 'Failed to load game'
  } finally {
    loading.value = false
  }
}

const subscribe = () => {
  subscription = subscribeGameUpdates(gameId.value, playerStore.playerKey || null).subscribe({
    next: (result: { data?: { gameUpdates?: GameStateDto } | null }) => {
      const data = result?.data
      if (data?.gameUpdates) {
        state.value = data.gameUpdates
      }
    },
    error: (err: unknown) => console.error('Game subscription error', err)
  })
}

const cleanup = () => {
  subscription?.unsubscribe()
  subscription = null
}

const round = computed(() => state.value?.round ?? null)

const hand = computed<SerializedCard[]>(() => {
  const cards = round.value?.myHand ?? []
  return cards.map(toSerialized)
})

const selfPlayer = computed(() => state.value?.players.find(player => player.isSelf))

const canPlay = computed(() => state.value?.status === 'ACTIVE' && selfPlayer.value?.isCurrentTurn)

const canDraw = computed(() => canPlay.value)

const canSayUno = computed(() => {
  if (!state.value || state.value.status !== 'ACTIVE') return false
  const me = selfPlayer.value
  if (!me || me.saidUno) return false
  const handSize = round.value?.myHand.length ?? me.cardCount
  if (handSize <= 0 || handSize > 2) return false
  if (me.isCurrentTurn) return true
  return handSize === 1
})

const topCard = computed(() => round.value?.discardTop ? toSerialized(round.value.discardTop) : null)

const canStart = computed(() => state.value?.status === 'PENDING' && (state.value?.players.length ?? 0) >= 2)

const winnerSeat = computed(() => state.value?.winnerSeat ?? null)

const winnerPlayer = computed(() => {
  if (winnerSeat.value === null || !state.value) return null
  return state.value.players.find(player => player.seat === winnerSeat.value) ?? null
})

const rankedPlayers = computed(() => {
  if (!state.value) return []
  return [...state.value.players].sort((a, b) => b.score - a.score)
})

const finishedAt = computed(() => {
  const timestamp = state.value?.completedAt
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
})

const showResults = computed(() => state.value?.status === 'COMPLETED' && !resultsAcknowledged.value)

const acknowledgeResults = () => {
  resultsAcknowledged.value = true
}

const needsColor = (card: SerializedCard) => card.type === 'WILD' || card.type === 'WILD DRAW'

const attemptPlay = (index: number) => {
  if (!canPlay.value || actionBusy.value) return
  const card = hand.value[index]
  if (!card) return
  if (needsColor(card)) {
    selectingIndex.value = index
    selectingColor.value = true
    return
  }
  executePlay(index)
}

const executePlay = async (index: number, color?: string) => {
  const key = requirePlayerKey()
  if (!key) return
  actionBusy.value = true
  errorMessage.value = ''
  try {
    const item = await playCardMutation(gameId.value, key, index, color)
    state.value = item
  } catch (err: any) {
    errorMessage.value = err?.message ?? 'Unable to play card'
  } finally {
    actionBusy.value = false
  }
}

const confirmColor = async (color: string) => {
  if (selectingIndex.value === null) return
  const index = selectingIndex.value
  selectingColor.value = false
  selectingIndex.value = null
  await executePlay(index, color)
}

const cancelColor = () => {
  selectingColor.value = false
  selectingIndex.value = null
}

const draw = async () => {
  if (!canDraw.value || actionBusy.value) return
  const key = requirePlayerKey()
  if (!key) return
  actionBusy.value = true
  errorMessage.value = ''
  try {
    const newState = await drawCardMutation(gameId.value, key)
    state.value = newState
  } catch (err: any) {
    errorMessage.value = err?.message ?? 'Unable to draw card'
  } finally {
    actionBusy.value = false
  }
}

const handleSayUno = async () => {
  if (!canSayUno.value || actionBusy.value) return
  const key = requirePlayerKey()
  if (!key) return
  actionBusy.value = true
  errorMessage.value = ''
  try {
    const newState = await sayUnoMutation(gameId.value, key)
    state.value = newState
  } catch (err: any) {
    errorMessage.value = err?.message ?? 'Unable to say UNO'
  } finally {
    actionBusy.value = false
  }
}

const start = async () => {
  if (!canStart.value || actionBusy.value) return
  const key = requirePlayerKey()
  if (!key) return
  actionBusy.value = true
  errorMessage.value = ''
  try {
    const newState = await startGameMutation(gameId.value, key)
    state.value = newState
  } catch (err: any) {
    errorMessage.value = err?.message ?? 'Unable to start the game'
  } finally {
    actionBusy.value = false
  }
}

const callUno = async (seat: number) => {
  if (actionBusy.value) return
  const key = requirePlayerKey()
  if (!key) return
  actionBusy.value = true
  errorMessage.value = ''
  try {
    const newState = await catchUnoMutation(gameId.value, key, seat)
    state.value = newState
  } catch (err: any) {
    errorMessage.value = err?.message ?? 'Call failed'
  } finally {
    actionBusy.value = false
  }
}

const leave = async () => {
  if (actionBusy.value) return
  const key = playerStore.playerKey
  actionBusy.value = true
  try {
    if (key) {
      await leaveGameMutation(gameId.value, key)
      playerStore.clearKey()
    }
  } catch (err) {
    console.error(err)
  } finally {
    actionBusy.value = false
    router.replace({ name: 'lobby' })
  }
}

const toSerialized = (card: CardDto): SerializedCard => {
  if (card.type === 'NUMBERED') {
    return {
      type: 'NUMBERED',
      color: (card.color ?? 'RED') as SerializedNumberedCard['color'],
      number: card.number ?? 0
    }
  }
  if (card.type === 'SKIP' || card.type === 'REVERSE' || card.type === 'DRAW') {
    return {
      type: card.type as SerializedActionCard['type'],
      color: (card.color ?? 'RED') as SerializedActionCard['color']
    }
  }
  if (card.type === 'WILD' || card.type === 'WILD DRAW') {
    return { type: card.type as SerializedWildCard['type'] }
  }
  return { type: 'WILD' }
}

const formatLog = (message: string, timestamp: string) => {
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${time} – ${message}`
}

onMounted(async () => {
  await loadState()
  subscribe()
})

onBeforeUnmount(() => {
  cleanup()
})

watch(
  () => state.value?.status,
  status => {
    if (status !== 'COMPLETED') {
      resultsAcknowledged.value = false
    }
  }
)

watch(
  () => playerStore.playerKey,
  () => {
    cleanup()
    subscribe()
  }
)
</script>

<style scoped>
.game-room {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: min(1180px, 100%);
  margin: 0 auto;
  color: #f5f6ff;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.game-header h2 {
  margin: 0;
  font-size: 2.2rem;
}

.status {
  font-weight: 600;
  text-transform: uppercase;
  margin-left: 0.35rem;
}

.status.pending {
  color: #ffcf56;
}

.status.active {
  color: #5be37f;
}

.status.completed {
  color: #9cb3ff;
}

.header-actions {
  display: flex;
  gap: 0.8rem;
}

.players {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.player-card {
  background: rgba(20, 26, 42, 0.92);
  border-radius: 18px;
  padding: 1.2rem;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.25);
  display: grid;
  gap: 0.4rem;
}

.player-card.current {
  border: 1px solid rgba(255, 205, 97, 0.7);
}

.player-card.self {
  border: 1px solid rgba(91, 212, 255, 0.7);
}

.player-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.player-card h3 {
  margin: 0;
  font-size: 1.2rem;
}

.turn {
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 205, 97, 0.12);
  color: #ffce61;
  font-size: 0.8rem;
  font-weight: 600;
}

.details {
  margin: 0;
  color: rgba(225, 229, 255, 0.75);
}

.primary,
.secondary {
  border: none;
  border-radius: 999px;
  padding: 0.65rem 1.4rem;
  font-weight: 600;
  cursor: pointer;
}

.primary {
  background: linear-gradient(130deg, #ff6a3d 0%, #ffb347 100%);
  color: #fff;
}

.secondary {
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
}

.pending-panel {
  background: rgba(18, 22, 34, 0.92);
  border-radius: 20px;
  padding: 1.5rem;
  display: grid;
  gap: 1rem;
}

.board {
  display: grid;
  gap: 2rem;
  padding: 1.5rem;
  background: rgba(18, 22, 34, 0.92);
  border-radius: 24px;
  box-shadow: 0 25px 55px rgba(0, 0, 0, 0.3);
}

.board__center {
  display: flex;
  justify-content: center;
  gap: 3rem;
}

.draw,
.discard {
  display: grid;
  gap: 0.6rem;
  align-items: center;
  text-align: center;
}

.draw.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.color-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.08rem;
  color: #0f111c;
  background: rgba(255, 255, 255, 0.85);
}

.color-chip.red {
  background: #ff6a6a;
}

.color-chip.green {
  background: #68f18d;
}

.color-chip.blue {
  background: #5cb8ff;
}

.color-chip.yellow {
  background: #fde481;
}

.board__actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.message {
  margin: 0;
  color: #ff9c9c;
}

.hand {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  justify-content: center;
}

.empty-hand {
  text-align: center;
  color: rgba(225, 229, 255, 0.7);
}

.log {
  background: rgba(18, 22, 34, 0.92);
  border-radius: 20px;
  padding: 1.3rem 1.6rem;
}

.log h3 {
  margin: 0 0 0.8rem 0;
}

.log ul {
  margin: 0;
  padding-left: 1.2rem;
  color: rgba(223, 229, 255, 0.75);
  display: grid;
  gap: 0.4rem;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 8, 16, 0.78);
  display: grid;
  place-items: center;
}

.color-dialog {
  background: rgba(18, 24, 36, 0.95);
  padding: 2rem;
  border-radius: 18px;
  display: grid;
  gap: 1rem;
  color: #fff;
}

.choices {
  display: flex;
  gap: 0.8rem;
  justify-content: center;
}

.loader {
  text-align: center;
  padding: 4rem 0;
  color: #f5f6ff;
}

@media (max-width: 820px) {
  .board__center {
    flex-direction: column;
    gap: 1.5rem;
  }
}
</style>
