import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './styles/global.css'
import { usePlayerStore } from './stores/userStore'

async function bootstrap() {
	const app = createApp(App)
	const pinia = createPinia()
	app.use(pinia)

	const playerStore = usePlayerStore(pinia)
	await playerStore.initialize()

	router.beforeEach(to => {
		if (to.meta?.requiresAuth && !playerStore.isAuthenticated) {
			return { name: 'auth', query: { redirect: to.fullPath } }
		}
		if (to.name === 'auth' && playerStore.isAuthenticated) {
			return { name: 'lobby' }
		}
		return true
	})

	app.use(router)
	app.mount('#app')
}

bootstrap().catch(error => {
	console.error('Failed to bootstrap application', error)
})
