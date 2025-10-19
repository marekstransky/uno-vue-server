<template>
  <section class="lobby">
    <header class="lobby__header">
      <div>
  <h2>Game Lobby</h2>
  <p>Choose a name, host a match, or join an existing table.</p>
  <p class="account" v-if="accountName">Signed in as <strong>{{ accountName }}</strong></p>
      </div>
    </header>

    <div class="lobby__content">
      <section class="panel">
        <header>
          <h3>Your name</h3>
          <p>Pick the nickname shown to other players.</p>
        </header>
        <label class="name-input">
          <span>Display name</span>
          <input v-model.trim="playerName" maxlength="24" placeholder="e.g. Luna" />
        </label>
      </section>

      <section class="panel">
        <header>
          <h3>Create a table</h3>
          <p>Configure seats and cards per player.</p>
        </header>
        <form class="create-form" @submit.prevent="createAndEnter">
          <label>
            <span>Players</span>
            <input type="number" min="2" max="4" v-model.number="seats" />
          </label>
          <label>
            <span>Cards per player</span>
            <input type="number" min="5" max="10" v-model.number="cardsPerPlayer" />
          </label>
          <button class="primary" type="submit" :disabled="busy">
            {{ busy ? 'Creating…' : 'Create & enter' }}
          </button>
          <p v-if="formError" class="error">{{ formError }}</p>
        </form>
      </section>

      <section class="panel">
        <header>
          <h3>Pending games</h3>
          <p v-if="pendingGames.length === 0">No open tables right now.</p>
        </header>
        <ul class="game-list">
          <li v-for="game in pendingGames" :key="game.id">
            <div class="meta">
              <strong>{{ game.code }}</strong>
              <span>{{ game.players.length }}/{{ game.seats }} players</span>
            </div>
            <div class="players">
              <span v-for="player in game.players" :key="player.seat" :class="{ self: player.isSelf }">
                {{ player.name }}
              </span>
            </div>
            <button class="secondary" type="button" :disabled="joining[game.id]" @click="enterGame(game.id)">
              {{ joining[game.id] ? 'Joining…' : 'Join' }}
            </button>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createGame, fetchPendingGames, joinGame, subscribePendingGames } from '@/graphql/api'
import type { PendingGameDto } from '@/types/api'
import { usePlayerStore } from '@/stores/userStore'

const router = useRouter()
const store = usePlayerStore()

const seats = ref(2)
const cardsPerPlayer = ref(7)
const busy = ref(false)
const formError = ref('')
const pendingGames = ref<PendingGameDto[]>([])
const joining = reactive<Record<string, boolean>>({})
let subscription: { unsubscribe(): void } | null = null

const playerName = ref(store.playerName)
const accountName = computed(() => store.currentUser?.username ?? '')

const refreshPending = async () => {
  pendingGames.value = await fetchPendingGames(store.playerKey || null)
}

const refresh = async () => {
  await refreshPending()
}

const handlePendingUpdate = (game: PendingGameDto) => {
  const index = pendingGames.value.findIndex(entry => entry.id === game.id)
  if (game.status === 'PENDING') {
    if (index >= 0) pendingGames.value[index] = game
    else pendingGames.value.push(game)
  } else if (index >= 0) {
    pendingGames.value.splice(index, 1)
  }
}

const createSubscription = () => {
  subscription?.unsubscribe()
  subscription = subscribePendingGames(store.playerKey || null).subscribe({
    next: (result: { data?: { pendingGames?: PendingGameDto } | null }) => {
      const data = result?.data
      if (data?.pendingGames) {
        handlePendingUpdate(data.pendingGames)
      }
    },
    error: (err: unknown) => console.error('Pending games subscription failed', err)
  })
}

const createAndEnter = async () => {
  if (busy.value) return
  if (!playerName.value.trim()) {
    formError.value = 'Please enter a name before creating a game.'
    return
  }
  busy.value = true
  formError.value = ''
  try {
    const result = await createGame(playerName.value, seats.value, cardsPerPlayer.value)
    store.rememberIdentity(playerName.value, result.playerKey)
    await refreshPending()
    await router.push({ name: 'game', params: { id: result.game.id } })
  } catch (err: any) {
    formError.value = err?.message ?? 'Unable to create game'
  } finally {
    busy.value = false
  }
}

const enterGame = async (gameId: string) => {
  if (joining[gameId]) return
  if (!playerName.value.trim()) {
    formError.value = 'Please enter a name before joining a game.'
    return
  }
  joining[gameId] = true
  try {
    const result = await joinGame(gameId, playerName.value)
    store.rememberIdentity(playerName.value, result.playerKey)
    await router.push({ name: 'game', params: { id: gameId } })
  } catch (err) {
    console.error(err)
  } finally {
    joining[gameId] = false
  }
}

watch(playerName, (value: string) => {
  store.setPlayerName(value)
})

watch(
  () => store.playerKey,
  async () => {
    await refreshPending()
    createSubscription()
  }
)

onMounted(async () => {
  await refresh()
  createSubscription()
})

onBeforeUnmount(() => {
  subscription?.unsubscribe()
})
</script>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: min(1100px, 100%);
  margin: 0 auto;
  color: #f5f6ff;
}

.lobby__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.lobby__header h2 {
  margin: 0;
  font-size: 2.3rem;
}

.lobby__header p {
  margin: 0.4rem 0 0 0;
  color: rgba(223, 229, 255, 0.75);
}

.account {
  margin-top: 0.4rem;
}

.profile {
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  padding: 0.6rem 1.4rem;
  color: inherit;
  text-decoration: none;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08rem;
}

.lobby__content {
  display: grid;
  gap: 1.5rem;
}

.panel {
  background: rgba(18, 22, 34, 0.92);
  border-radius: 24px;
  padding: 1.8rem;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
  display: grid;
  gap: 1.2rem;
}

.panel header h3 {
  margin: 0;
  font-size: 1.4rem;
}

.panel header p {
  margin: 0.35rem 0 0 0;
  color: rgba(223, 229, 255, 0.6);
}

.create-form {
  display: grid;
  gap: 1.1rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.create-form label {
  display: grid;
  gap: 0.4rem;
  font-weight: 500;
}

.create-form input {
  padding: 0.7rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(24, 30, 44, 0.9);
  color: inherit;
}

.primary {
  grid-column: 1/-1;
  padding: 0.85rem 1.4rem;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  background: linear-gradient(130deg, #ff6a3d 0%, #ffb347 100%);
  color: #fff;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.error {
  grid-column: 1/-1;
  margin: 0;
  color: #ff9c9c;
}

.game-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.game-list li {
  display: grid;
  gap: 0.6rem;
  border-radius: 18px;
  padding: 1rem 1.4rem;
  background: rgba(26, 32, 48, 0.92);
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
}

.name-input {
  display: grid;
  gap: 0.5rem;
  font-weight: 500;
}

.name-input input {
  padding: 0.7rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(24, 30, 44, 0.9);
  color: inherit;
}

.players {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: rgba(223, 229, 255, 0.8);
}

.players .self {
  font-weight: 600;
  color: #ffb347;
}

.secondary {
  justify-self: flex-start;
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1.2rem;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.secondary:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (max-width: 720px) {
  .lobby__content {
    gap: 1rem;
  }

  .create-form {
    grid-template-columns: 1fr;
  }
}
</style>
