import { createRouter, createWebHashHistory } from 'vue-router'

const SetupView = () => import('@/views/SetupView.vue')
const GameView = () => import('@/views/GameView.vue')
const ResultView = () => import('@/views/ResultView.vue')

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'setup',
      component: SetupView
    },
    {
      path: '/play',
      name: 'game',
      component: GameView
    },
    {
      path: '/result',
      name: 'result',
      component: ResultView
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})
