import { createRouter, createWebHistory } from 'vue-router'

const LobbyView = () => import('@/views/LobbyView.vue')
const GameRoomView = () => import('@/views/GameRoomView.vue')
const AuthView = () => import('@/views/AuthView.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/lobby'
    },
    {
      path: '/lobby',
      name: 'lobby',
      component: LobbyView,
      meta: { requiresAuth: true }
    },
    {
      path: '/game/:id',
      name: 'game',
      component: GameRoomView,
      meta: { requiresAuth: true }
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/lobby'
    }
  ]
})
