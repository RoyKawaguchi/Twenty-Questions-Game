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
  () => gameStore.gameStage === 'PLAYING' || gameStore.gameStage === 'FINAL_GUESS',
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
          <template v-if="loggedIn">
            <span class="disabled-wrapper">
              <RouterLink to="/" :class="{ disabled: inGame }">Home</RouterLink>
              <span v-if="inGame" class="tooltip"> Please complete or save your game first! </span>
            </span>

            <span class="disabled-wrapper">
              <RouterLink to="/profile" :class="{ disabled: inGame }"> Profile </RouterLink>
              <span v-if="inGame" class="tooltip"> Please complete or save your game first! </span>
            </span>

            <span class="disabled-wrapper">
              <RouterLink to="/leaderboard" :class="{ disabled: inGame }"> Leaderboard </RouterLink>
              <span v-if="inGame" class="tooltip"> Please complete or save your game first! </span>
            </span>
          </template>

          <RouterLink v-if="!loggedIn" to="/login"> Log In </RouterLink>

          <span class="disabled-wrapper">
            <RouterLink to="/guide" :class="{ disabled: inGame }"> Guide </RouterLink>
            <span v-if="inGame" class="tooltip"> Please complete or save your game first! </span>
          </span>
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
        <span class="disabled-wrapper">
          <RouterLink to="/about" :class="{ disabled: inGame }"> About </RouterLink>
          <span v-if="inGame" class="tooltip"> Please complete or save your game first! </span>
        </span>

        <span class="disabled-wrapper">
          <RouterLink to="/feedback" :class="{ disabled: inGame }"> Feedback </RouterLink>
          <span v-if="inGame" class="tooltip"> Please complete or save your game first! </span>
        </span>
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

/* Disabled link styling */
.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Wrapper keeps hover working */
.disabled-wrapper {
  position: relative;
  display: inline-block;
}

/* Tooltip */
.tooltip {
  position: absolute;
  z-index: 1000;
  bottom: -35px;
  left: 50%;
  transform: translateX(-50%);

  background: #333;
  color: white;
  padding: 6px 10px;
  border-radius: 6px;

  font-size: 0.8rem;
  white-space: nowrap;

  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.disabled-wrapper:hover .tooltip {
  opacity: 1;
}
</style>
