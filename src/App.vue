<template>
  <div class="app-shell">
    <header class="top-bar">
      <RouterLink class="brand" to="/lobby">UNO Arena</RouterLink>
      <div class="session" v-if="store.isAuthenticated">
        <span class="session__user">{{ store.currentUser?.username }}</span>
        <button class="session__logout" type="button" @click="handleLogout" :disabled="loggingOut">
          {{ loggingOut ? 'Logging out…' : 'Log out' }}
        </button>
      </div>
      <RouterLink v-else class="session__login" to="/auth">Sign in</RouterLink>
    </header>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/userStore'

const router = useRouter()
const store = usePlayerStore()
const loggingOut = ref(false)

const handleLogout = async () => {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await store.logout()
    await router.replace({ name: 'auth' })
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at top left, rgba(255, 110, 82, 0.18), transparent 55%),
    radial-gradient(circle at bottom right, rgba(82, 140, 255, 0.16), transparent 50%),
    linear-gradient(160deg, rgba(14, 18, 28, 0.96) 0%, rgba(8, 10, 18, 0.96) 100%);
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.4rem 2.6rem;
  color: #f5f6ff;
}

.brand {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.12rem;
  text-decoration: none;
  color: inherit;
}

.session {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-weight: 600;
}

.session__user {
  letter-spacing: 0.06rem;
}

.session__logout {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 1.1rem;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.14);
  color: inherit;
  font-weight: 600;
}

.session__logout:disabled {
  opacity: 0.6;
  cursor: default;
}

.session__login {
  border-radius: 999px;
  padding: 0.45rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: inherit;
  text-decoration: none;
  font-weight: 600;
  letter-spacing: 0.08rem;
}

.content {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

@media (max-width: 720px) {
  .top-bar {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .content {
    padding: 1.2rem;
  }
}
</style>
