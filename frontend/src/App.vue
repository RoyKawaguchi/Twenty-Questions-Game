<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { computed, ref, onMounted } from 'vue' // Added ref and onMounted
import ProfileMenu from './components/ProfileMenuView.vue'

import { useAuthStore } from './stores/authStore.js'
const authStore = useAuthStore()
import { useGameStore } from './stores/gameStore.js'
const gameStore = useGameStore()

const loggedIn = computed(() => authStore.username !== '')
const inGame = computed(
  () => gameStore.gameStage !== 'NOT_PLAYING' && gameStore.gameStage !== 'LOBBY',
)

const isWarmingUp = ref(false)

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

onMounted(async () => {
  // Only show banner if server takes longer than 1.5s to respond
  const timer = setTimeout(() => {
    isWarmingUp.value = true
  }, 1500)

  try {
    await fetch(`${BACKEND_URL}/health`, { method: 'GET' })
  } catch (err) {
    console.warn('Backend warm-up ping initiated...', err)
  } finally {
    clearTimeout(timer)
    isWarmingUp.value = false
  }
})
</script>

<template>
  <div id="app">
    <!-- Server Warm-up Notification Banner -->
    <Transition name="fade">
      <div v-if="isWarmingUp" class="wake-banner">
        ⚡ Waking up backend server (~30s on first load)... Thanks for your patience!
      </div>
    </Transition>

    <nav class="navbar">
      <div class="logo">
        <RouterLink to="/" custom v-slot="{ navigate }">
          <span class="logo" @click="!inGame && navigate()"> ::twenty </span>
        </RouterLink>
      </div>

      <div class="nav-right">
        <div class="nav-links">
          <RouterLink v-if="loggedIn && !inGame" to="/">Home</RouterLink>
          <RouterLink v-if="loggedIn && !inGame" to="/profile">Profile</RouterLink>
          <RouterLink v-if="loggedIn && !inGame" to="/leaderboard">Leaderboard</RouterLink>
          <RouterLink v-if="!loggedIn && !inGame" to="/login">Log In</RouterLink>
          <RouterLink v-if="!inGame" to="/about">About</RouterLink>
        </div>

        <ProfileMenu v-if="loggedIn" />
      </div>
    </nav>

    <!-- Vue Router dynamically injects different Views here! -->
    <main class="content-area">
      <RouterView />
    </main>

    <footer class="footer">
      <p>© 2026 ::twenty. All rights reserved.</p>

      <div class="footer-links">
        <RouterLink v-if="!inGame" to="/about">About</RouterLink>
        <RouterLink v-if="!inGame" to="/feedback">Feedback</RouterLink>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.wake-banner {
  background-color: #fef3c7;
  color: #92400e;
  text-align: center;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  border-bottom: 1px solid #fde68a;
}

/* Smooth fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
