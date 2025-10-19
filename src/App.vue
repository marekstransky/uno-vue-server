<template>
  <div class="app-shell">
    <header class="app-header">
      <h1 class="title">
        <span class="uno">UNO</span>
        <span class="subtitle">Against Bots</span>
      </h1>
      <RouterLink class="home-link" to="/">
        <span>Setup</span>
      </RouterLink>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(160deg, rgba(22, 28, 41, 0.9) 0%, rgba(12, 17, 29, 0.92) 100%);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 3rem;
  z-index: 10;
}

.title {
  margin: 0;
  display: flex;
  flex-direction: column;
  color: #f5f5f5;
}

.uno {
  font-size: 2.8rem;
  font-weight: 700;
  letter-spacing: 0.2rem;
}

.subtitle {
  font-size: 0.9rem;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.3rem;
  color: #ffdd57;
}

.home-link {
  color: #f5f5f5;
  text-transform: uppercase;
  letter-spacing: 0.15rem;
  font-weight: 600;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease-in-out;
}

.home-link:hover {
  border-color: #ff4656;
  color: #ff4656;
}

.app-main {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: stretch;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .subtitle {
    letter-spacing: 0.2rem;
  }
}
</style>
