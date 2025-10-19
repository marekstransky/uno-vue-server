<template>
  <section class="result-card" v-if="result">
    <header>
      <h2>{{ result.winnerName }} wins the round!</h2>
      <p class="points">{{ result.pointsAwarded }} points collected</p>
    </header>

    <ul class="scoreboard">
      <li v-for="player in result.players" :key="player.name" :class="{ winner: player.name === result.winnerName }">
        <div class="player-name">{{ player.name }}</div>
        <div class="player-cards">Remaining cards: {{ player.remainingCards }}</div>
        <div v-if="player.cards && player.cards.length" class="card-list">
          <span v-for="card in player.cards" :key="card">{{ card }}</span>
        </div>
      </li>
    </ul>

    <footer class="actions">
      <button v-if="store.config" @click="rematch">Rematch</button>
      <button class="secondary" @click="toSetup">New setup</button>
    </footer>
  </section>
  <section class="result-card" v-else>
    <p>No result yet.</p>
    <button class="secondary" @click="toSetup">Back to setup</button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMatchStore } from '@/stores/matchStore'

const store = useMatchStore()
const router = useRouter()

const result = computed(() => store.result)

const rematch = () => {
  store.result = undefined
  router.push({ name: 'game' })
}

const toSetup = () => {
  router.push({ name: 'setup' })
}
</script>

<style scoped>
.result-card {
  width: min(720px, 100%);
  margin: 0 auto;
  padding: 2.5rem;
  border-radius: 28px;
  background: rgba(18, 22, 35, 0.85);
  color: #f5f5f5;
  display: grid;
  gap: 1.6rem;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.3);
  text-align: center;
}

header h2 {
  margin: 0;
  font-size: 2rem;
}

.points {
  margin: 0;
  color: rgba(255, 221, 87, 0.9);
  letter-spacing: 0.08rem;
  text-transform: uppercase;
}

.scoreboard {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.scoreboard li {
  padding: 1rem 1.4rem;
  border-radius: 18px;
  background: rgba(24, 30, 46, 0.85);
  display: grid;
  gap: 0.4rem;
}

.scoreboard li.winner {
  border: 1px solid rgba(255, 221, 87, 0.8);
}

.player-name {
  font-weight: 700;
  font-size: 1.1rem;
}

.player-cards {
  font-size: 0.9rem;
  color: rgba(217, 225, 240, 0.75);
}

.card-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

button {
  border: none;
  padding: 0.9rem 1.6rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(120deg, #ff4656 0%, #ff9966 100%);
  color: #fff;
  letter-spacing: 0.08rem;
  text-transform: uppercase;
}

button.secondary {
  background: rgba(0, 153, 255, 0.75);
}
</style>
