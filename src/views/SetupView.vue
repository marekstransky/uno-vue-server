<template>
  <section class="setup-card">
    <div class="intro">
      <h2>Assemble Your Table</h2>
      <p>Select your rivals and jump into a fast paced UNO duel against our bot crew.</p>
    </div>

    <form class="setup-form" @submit.prevent="startGame">
      <label class="field">
        <span>Player name</span>
        <input v-model.trim="humanName" placeholder="Your awesome name" required />
      </label>

      <label class="field">
        <span>Bot count</span>
        <input type="range" min="1" max="3" v-model.number="botCount" />
        <div class="bot-count">{{ botCount }} bot{{ botCount > 1 ? 's' : '' }}</div>
      </label>

      <label class="field">
        <span>Cards per player</span>
        <input type="number" min="5" max="10" v-model.number="cardsPerPlayer" />
      </label>

      <div class="bot-preview">
        <h3 class="bot-preview__title">Incoming bots</h3>
        <ul>
          <li v-for="bot of previewBots" :key="bot.name">
            <span class="bot-name">{{ bot.name }}</span>
            <small>UNO forgets: {{ Math.round(bot.forgetUnoChance * 100) }}% · Calls out: {{ Math.round(bot.catchUnoChance * 100) }}%</small>
          </li>
        </ul>
      </div>

      <button class="start-button" type="submit">Launch Game</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMatchStore } from '@/stores/matchStore'

const BOT_NAME_POOL = ['Astra', 'Bolt', 'Cipher', 'Echo', 'Flux', 'Nova', 'Rogue', 'Vega']

const store = useMatchStore()
const router = useRouter()

const humanName = ref(store.config?.humanName ?? 'You')
const botCount = ref(store.config?.botConfigs.length ?? 2)
const cardsPerPlayer = ref(store.config?.cardsPerPlayer ?? 7)

const previewBots = reactive<{ name: string; forgetUnoChance: number; catchUnoChance: number }[]>([])

const createBotConfig = (name: string) => ({
  name,
  forgetUnoChance: 0.25 + Math.random() * 0.25,
  catchUnoChance: 0.45 + Math.random() * 0.35
})

const refreshBots = () => {
  previewBots.splice(0)
  for (let i = 0; i < botCount.value; i++) {
    const name = BOT_NAME_POOL[i % BOT_NAME_POOL.length]
    previewBots.push(createBotConfig(name))
  }
}

watch(botCount, refreshBots, { immediate: true })

const startGame = () => {
  if (!humanName.value) return
  const configs = previewBots.slice(0, botCount.value)
  store.setConfig({
    humanName: humanName.value,
    botConfigs: configs,
    cardsPerPlayer: cardsPerPlayer.value
  })
  router.push({ name: 'game' })
}
</script>

<style scoped>
.setup-card {
  width: min(680px, 100%);
  margin: 2rem auto;
  padding: 2.5rem;
  border-radius: 28px;
  background: rgba(18, 21, 35, 0.85);
  box-shadow: 0 35px 80px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  color: #f5f5f5;
  display: grid;
  gap: 2rem;
}

.intro h2 {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
}

.intro p {
  margin: 0;
  color: #d8dde8;
}

.setup-form {
  display: grid;
  gap: 1.4rem;
}

.field {
  display: grid;
  gap: 0.6rem;
  font-weight: 500;
}

.field input[type='text'],
.field input[type='number'] {
  padding: 0.8rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(15, 19, 32, 0.9);
  color: #f5f5f5;
  font-size: 1rem;
  transition: border 0.2s ease-in-out;
}

.field input[type='text']:focus,
.field input[type='number']:focus {
  outline: none;
  border-color: #ff4656;
}

.field input[type='range'] {
  accent-color: #ff4656;
}

.bot-count {
  font-size: 0.85rem;
  letter-spacing: 0.08rem;
  text-transform: uppercase;
  color: #ffdd57;
}

.bot-preview {
  padding: 1.2rem 1.4rem;
  border-radius: 18px;
  background: rgba(12, 16, 28, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.bot-preview__title {
  margin: 0 0 0.8rem 0;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.12rem;
  color: rgba(255, 221, 87, 0.9);
}

.bot-preview ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.4rem;
}

.bot-preview li {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
  border-radius: 12px;
  background: rgba(33, 39, 60, 0.65);
  font-size: 0.95rem;
}

.bot-name {
  font-weight: 600;
}

.bot-preview small {
  color: rgba(218, 226, 241, 0.75);
}

.start-button {
  margin-top: 0.4rem;
  padding: 0.95rem 1.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  border-radius: 999px;
  border: none;
  background: linear-gradient(130deg, #ff4656 0%, #ff9966 100%);
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s ease-in-out, box-shadow 0.2s;
}

.start-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(255, 70, 86, 0.35);
}

@media (max-width: 600px) {
  .setup-card {
    padding: 1.6rem;
  }
}
</style>
