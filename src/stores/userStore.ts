import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { registerUser, loginUser, logoutUser, fetchCurrentUser } from '@/graphql/api'
import type { AuthPayloadDto, UserDto } from '@/types/api'
import { AUTH_TOKEN_STORAGE_KEY, NAME_STORAGE_KEY, PLAYER_KEY_STORAGE_KEY } from '@/constants/storage'

const readLocalValue = (key: string): string => {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

const persistValue = (key: string, value: string | null) => {
  if (typeof window === 'undefined') return
  try {
    if (value && value.length > 0) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  } catch (error) {
    console.warn('Storage write failed', error)
  }
}

const applyAuthPayload = (
  payload: AuthPayloadDto,
  authToken: { value: string },
  currentUser: { value: UserDto | null },
  playerName: { value: string },
  setPlayerName: (name: string) => void
) => {
  authToken.value = payload.token
  currentUser.value = payload.user
  persistValue(AUTH_TOKEN_STORAGE_KEY, payload.token)
  if (!payload.user.username) return
  if (!playerName.value.trim()) {
    setPlayerName(payload.user.username)
  }
}

export const usePlayerStore = defineStore('player', () => {
  const playerName = ref(readLocalValue(NAME_STORAGE_KEY))
  const playerKey = ref(readLocalValue(PLAYER_KEY_STORAGE_KEY))
  const authToken = ref(readLocalValue(AUTH_TOKEN_STORAGE_KEY))
  const currentUser = ref<UserDto | null>(null)

  const hasName = computed(() => playerName.value.trim().length > 0)
  const hasPlayerKey = computed(() => playerKey.value.trim().length > 0)
  const isAuthenticated = computed(() => Boolean(authToken.value) && currentUser.value !== null)

  const setPlayerName = (name: string) => {
    playerName.value = name
    persistValue(NAME_STORAGE_KEY, name.trim().length > 0 ? name : null)
  }

  const setPlayerKey = (key: string | null) => {
    const normalized = key ?? ''
    playerKey.value = normalized
    persistValue(PLAYER_KEY_STORAGE_KEY, normalized.trim().length > 0 ? normalized : null)
  }

  const setAuthToken = (token: string | null) => {
    const normalized = token ?? ''
    authToken.value = normalized
    persistValue(AUTH_TOKEN_STORAGE_KEY, normalized.trim().length > 0 ? normalized : null)
  }

  const setCurrentUser = (user: UserDto | null) => {
    currentUser.value = user
  }

  const rememberIdentity = (name: string, key: string) => {
    setPlayerName(name)
    setPlayerKey(key)
  }

  const clearKey = () => {
    setPlayerKey(null)
  }

  const clearAuth = () => {
    setAuthToken(null)
    setCurrentUser(null)
  }

  const initialize = async () => {
    if (!authToken.value) return
    try {
      const user = await fetchCurrentUser()
      if (user) {
        setCurrentUser(user)
        if (!playerName.value) {
          setPlayerName(user.username)
        }
      } else {
        clearAuth()
      }
    } catch (error) {
      console.warn('Failed to load current user', error)
      clearAuth()
    }
  }

  const register = async (username: string, password: string) => {
    const payload = await registerUser(username, password)
    applyAuthPayload(payload, authToken, currentUser, playerName, setPlayerName)
  }

  const login = async (username: string, password: string) => {
    const payload = await loginUser(username, password)
    applyAuthPayload(payload, authToken, currentUser, playerName, setPlayerName)
  }

  const logout = async () => {
    try {
      if (authToken.value) {
        await logoutUser()
      }
    } catch (error) {
      console.warn('Logout failed', error)
    } finally {
      clearAuth()
      clearKey()
    }
  }

  return {
    playerName,
    playerKey,
    authToken,
    currentUser,
    hasName,
    hasPlayerKey,
    isAuthenticated,
    setPlayerName,
    setPlayerKey,
    setAuthToken,
    setCurrentUser,
    rememberIdentity,
    clearKey,
    clearAuth,
    initialize,
    register,
    login,
    logout
  }
})
