<template>
  <div
    class="uno-card"
    :class="[{ clickable, highlight }, faceDown ? 'back' : colorClass]"
    @click="emit('select')"
  >
    <div class="card-inner" v-if="!faceDown">
      <div class="corner top">{{ shortLabel }}</div>
      <div class="symbol" :class="symbolClass">{{ symbol }}</div>
      <div class="corner bottom">{{ shortLabel }}</div>
    </div>
    <div class="card-back" v-else>
      <span>UNO</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SerializedCard } from '@model/cards'

const props = defineProps<{ card: SerializedCard; clickable?: boolean; faceDown?: boolean; highlight?: boolean }>()
const emit = defineEmits<{ (e: 'select'): void }>()

const colorClass = computed(() => {
  if (props.card.type === 'WILD' || props.card.type === 'WILD DRAW') return 'wild'
  if ('color' in props.card) return props.card.color.toLowerCase()
  return 'wild'
})

const symbol = computed(() => {
  switch (props.card.type) {
    case 'NUMBERED':
      return props.card.number.toString()
    case 'SKIP':
      return '⦸'
    case 'REVERSE':
      return '↺'
    case 'DRAW':
      return '+2'
    case 'WILD':
      return '★'
    case 'WILD DRAW':
      return '+4'
    default:
      return '?'
  }
})

const shortLabel = computed(() => {
  switch (props.card.type) {
    case 'NUMBERED':
      return props.card.number
    case 'SKIP':
      return '⦸'
    case 'REVERSE':
      return '↺'
    case 'DRAW':
      return '+2'
    case 'WILD':
      return 'W'
    case 'WILD DRAW':
      return '+4'
    default:
      return '?'
  }
})

const symbolClass = computed(() => ({
  action: props.card.type === 'SKIP' || props.card.type === 'REVERSE' || props.card.type === 'DRAW',
  wild: props.card.type === 'WILD' || props.card.type === 'WILD DRAW'
}))
</script>

<style scoped>
.uno-card {
  width: 92px;
  height: 140px;
  border-radius: 18px;
  padding: 12px;
  position: relative;
  transform: rotate(-2deg);
  transition: transform 0.15s ease-in-out, box-shadow 0.2s;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.uno-card.clickable {
  cursor: pointer;
}

.uno-card.clickable:hover {
  transform: translateY(-8px) rotate(0deg);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
}

.uno-card.highlight {
  box-shadow: 0 0 25px rgba(255, 221, 87, 0.7);
}

.card-inner {
  width: 100%;
  height: 100%;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.25);
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.corner {
  position: absolute;
  font-weight: 700;
  font-size: 1.4rem;
}

.corner.top {
  top: 8px;
  left: 12px;
}

.corner.bottom {
  bottom: 8px;
  right: 12px;
  transform: rotate(180deg);
}

.symbol {
  font-size: 2.4rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

.symbol.action {
  font-size: 2.8rem;
}

.symbol.wild {
  font-size: 2.4rem;
}

.blue {
  background: linear-gradient(135deg, #008cff 0%, #0054d1 100%);
}

.red {
  background: linear-gradient(135deg, #ff3e3e 0%, #b4162b 100%);
}

.green {
  background: linear-gradient(135deg, #4cd964 0%, #1f9b36 100%);
}

.yellow {
  background: linear-gradient(135deg, #fbd344 0%, #f6a500 100%);
}

.wild {
  background: linear-gradient(135deg, #0f0f0f 0%, #2e2e2e 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.back {
  background: linear-gradient(135deg, #ff3e3e 0%, #ffae00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.6rem;
  letter-spacing: 0.2rem;
  color: #fff;
}

.card-back {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 0.25rem;
}

@media (max-width: 780px) {
  .uno-card {
    width: 72px;
    height: 110px;
  }
}
</style>
