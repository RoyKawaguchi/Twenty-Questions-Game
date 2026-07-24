<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { computed } from 'vue'
import ProfileMenu from './components/ProfileMenuView.vue'

import { useAuthStore } from './stores/authStore.js'
const authStore = useAuthStore()
import { useGameStore } from './stores/gameStore.js'
const gameStore = useGameStore()

const loggedIn = computed(() => authStore.username !== '')
const inGame = computed(
  () => gameStore.gameStage !== 'NOT_PLAYING' && gameStore.gameStage !== 'LOBBY',
)
</script>

<template>
  <div id="app">
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

<style></style>
