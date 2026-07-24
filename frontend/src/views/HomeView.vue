<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { initializeSocketConnection } from '../services/socket'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

const router = useRouter()

function goToSP() {
  router.push('/singleplayer')
}

function goToMP() {
  router.push('/multiplayer/create')
}

onMounted(() => {
  initializeSocketConnection()
})
</script>

<template>
  <div class="home-page">
    <section class="welcome-card">
      <h1>Welcome back, {{ authStore.username }}!</h1>

      <p>Ready to sharpen your deduction skills?</p>
    </section>

    <section class="play-grid">
      <div class="play-card">
        <h2>👤 Singleplayer</h2>

        <p>Play at your own pace.</p>

        <button class="btn play-btn" @click="goToSP">Play</button>
      </div>

      <div class="play-card">
        <h2>👥 Multiplayer</h2>

        <p>Challenge your friends in a private lobby.</p>

        <button class="btn play-btn" @click="goToMP">Play</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 900px;
  margin: 40px auto;
  padding: 0 20px;

  display: flex;
  flex-direction: column;
  gap: 24px;
}

.welcome-card,
.play-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 24px;
}

.welcome-card h1 {
  margin: 0;
  font-size: 2rem;
}

.welcome-card p {
  margin-top: 10px;
  color: #666;
  line-height: 1.5;
}

.play-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.play-card {
  display: flex;
  flex-direction: column;
}

.play-card h2 {
  margin-top: 0;
  margin-bottom: 0px;
}

.play-card p {
  color: #666;
  line-height: 1.6;
  flex: 1;
  margin-left: 12px;
  margin-bottom: 12px;
}

.play-btn {
  align-self: flex-start;
}

@media (max-width: 700px) {
  .play-grid {
    grid-template-columns: 1fr;
  }

  .welcome-card h1 {
    font-size: 1.6rem;
  }
}
</style>
