<template>
  <section class="auth-card">
    <header class="auth-card__header">
      <h2>{{ heading }}</h2>
      <p>{{ subheading }}</p>
    </header>

    <form class="auth-form" @submit.prevent="submit">
      <label class="field">
        <span>Username</span>
        <input v-model.trim="username" maxlength="32" autocomplete="username" required />
      </label>

      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" autocomplete="current-password" minlength="6" required />
      </label>

      <label v-if="mode === 'register'" class="field">
        <span>Confirm password</span>
        <input v-model="confirm" type="password" autocomplete="new-password" minlength="6" required />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="primary" type="submit" :disabled="busy">
        {{ busy ? 'Please wait…' : ctaLabel }}
      </button>

      <button class="toggle" type="button" @click="toggleMode" :disabled="busy">
        {{ toggleLabel }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/userStore'

const store = usePlayerStore()
const router = useRouter()
const route = useRoute()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const confirm = ref('')
const busy = ref(false)
const error = ref('')

const heading = computed(() => (mode.value === 'login' ? 'Welcome back' : 'Create your account'))
const subheading = computed(() => (mode.value === 'login' ? 'Enter your credentials to access the lobby.' : 'Sign up to host and join UNO tables.'))
const ctaLabel = computed(() => (mode.value === 'login' ? 'Log in' : 'Register'))
const toggleLabel = computed(() => (mode.value === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'))

const redirectTarget = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/lobby'
})

const resetErrors = () => {
  error.value = ''
}

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  resetErrors()
  password.value = ''
  confirm.value = ''
}

const validatePasswords = () => {
  if (mode.value === 'register' && password.value !== confirm.value) {
    error.value = 'Passwords do not match.'
    return false
  }
  return true
}

const submit = async () => {
  if (busy.value) return
  resetErrors()
  if (!username.value.trim() || !password.value) {
    error.value = 'Please provide both username and password.'
    return
  }
  if (!validatePasswords()) return
  busy.value = true
  try {
    if (mode.value === 'login') {
      await store.login(username.value, password.value)
    } else {
      await store.register(username.value, password.value)
    }
    if (store.isAuthenticated) {
      await router.replace(redirectTarget.value)
    }
  } catch (err: any) {
    error.value = err?.message ?? 'Something went wrong.'
  } finally {
    busy.value = false
  }
}

watch(
  () => store.isAuthenticated,
  isAuth => {
    if (isAuth) {
      router.replace(redirectTarget.value)
    }
  }
)
</script>

<style scoped>
.auth-card {
  width: min(420px, 100%);
  margin: 3rem auto;
  padding: 2.4rem;
  border-radius: 28px;
  background: rgba(18, 22, 34, 0.92);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.35);
  display: grid;
  gap: 1.6rem;
  color: #f5f6ff;
}

.auth-card__header h2 {
  margin: 0;
  font-size: 2rem;
}

.auth-card__header p {
  margin: 0.4rem 0 0 0;
  color: rgba(223, 229, 255, 0.75);
}

.auth-form {
  display: grid;
  gap: 1rem;
}

.field {
  display: grid;
  gap: 0.5rem;
}

.field input {
  padding: 0.75rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(24, 30, 44, 0.9);
  color: inherit;
}

.primary {
  padding: 0.85rem 1.4rem;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(130deg, #ff6a3d 0%, #ffb347 100%);
  color: #fff;
}

.primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.toggle {
  border: none;
  background: none;
  color: rgba(223, 229, 255, 0.85);
  cursor: pointer;
  font-weight: 600;
}

.error {
  margin: 0;
  color: #ff9c9c;
}
</style>
