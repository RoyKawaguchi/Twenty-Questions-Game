<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { initializeSocketConnection } from '../services/socket'
import { useAuthStore } from '../stores/authStore'
import { logout } from '../services/authService.js'

const authStore = useAuthStore()

const nickname = computed(() => {
  if (!authStore.isGuest) return ''

  const username = authStore.username
  const lastHyphen = username.lastIndexOf('-')

  return lastHyphen === -1 ? username : username.substring(0, lastHyphen)
})

const currentDate = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const router = useRouter()

function goToSP() {
  router.push('/singleplayer')
}

function goToMP() {
  router.push('/multiplayer/create')
}

onMounted(() => {
  try {
    initializeSocketConnection()
  } catch (error) {
    alert('Session ran out. Please login again!')
    logout()
  }
})
</script>

<template>
  <div class="home-page">
    <section class="welcome-card gradient-card animate-in">
      <div class="welcome-content">
        <h1 v-if="authStore.isGuest">
          Welcome, {{ nickname }} <span class="guest-label">(guest)</span>!
        </h1>

        <h1 v-else>Welcome back, {{ authStore.username }}!</h1>

        <p class="date-text">
          {{ currentDate }}
        </p>

        <p v-if="authStore.isGuest" class="guest-message">
          Want to make it official?
          <RouterLink to="/signup" class="custom-link"> Sign up here </RouterLink>
          :)
        </p>

        <p v-else class="return-message">It is nice to have you back.</p>
      </div>
    </section>

    <section class="play-grid">
      <div class="play-card">
        <h2>👤 Singleplayer</h2>

        <p>Play at your own pace and enjoy the experience solo.</p>

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
  gap: 28px;
}

.welcome-card {
  border-radius: 14px;
  padding: 36px;
}

.welcome-card h1 {
  margin: 0;

  font-size: 2.4rem;
  font-weight: 750;

  color: white;
  letter-spacing: -0.03em;
}

.guest-label {
  color: #fbbf24;
  font-size: 1.4rem;
}

.date-text {
  display: inline-block;

  margin-top: 18px !important;
  padding: 7px 15px;

  background: rgba(99, 102, 241, 0.15);

  border: 1px solid rgba(99, 102, 241, 0.35);
  border-radius: 999px;

  color: #c7d2fe !important;

  font-size: 1rem;
}

.welcome-card p {
  color: #c4c4d4;
  line-height: 1.6;
}

.guest-message,
.return-message {
  margin-top: 18px;
  font-size: 1.05rem;
}

.custom-link {
  color: #a5b4fc;
  font-weight: 600;
  text-decoration: none;

  transition: color 0.2s ease;
}

.custom-link:hover {
  color: #c7d2fe;
  text-decoration: underline;
}

/* Game cards */
.play-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.play-card {
  min-height: 230px;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  text-align: center;

  background: #1a1a1a;

  border: 1px solid #3f3f46;
  border-radius: 18px;

  padding: 28px;

  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);

  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

.play-card:hover {
  transform: translateY(-5px);

  border-color: rgba(99, 102, 241, 0.6);

  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.45);
}

.play-card h2 {
  margin: 0;

  font-size: 1.8rem;

  color: white;
}

.play-card p {
  color: #d4d4d8;

  line-height: 1.6;

  margin: 14px 0 18px;
}

.play-btn {
  margin-top: auto;
}

@media (max-width: 700px) {
  .play-grid {
    grid-template-columns: 1fr;
  }

  .welcome-card {
    padding: 28px 22px;
  }

  .welcome-card h1 {
    font-size: 1.8rem;
  }
}
</style>
