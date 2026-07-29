<script setup>
import { ref, computed, onMounted } from 'vue'

import { initializeSocketConnection } from '../services/socket'
import { getUserInfo } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import MatchHistoryRow from '../components/MatchHistoryRow.vue'
import { logout } from '../services/authService.js'

const authStore = useAuthStore()

const loading = ref(true)
const failed = ref(false)

const userInfo = ref(null)
const activeTab = ref('singleplayer')

const activeHistory = computed(() => {
  if (!userInfo.value) return []

  if (activeTab.value === 'singleplayer') {
    return userInfo.value.historySingleplayer || []
  } else {
    return userInfo.value.historyMultiplayer || []
  }
})

const rankNote = computed(() => {
  if (!userInfo.value) return ''

  if (userInfo.value.is_guest) {
    return 'Create an account to be ranked!'
  }
  if ((userInfo.value.historySingleplayer || []).length < 3) {
    return 'Play at least 3 matches to be ranked!'
  }

  return 'Rank updated daily based on global performance metric indices.'
})

onMounted(async () => {
  initializeSocketConnection()

  loading.value = true
  failed.value = false
  try {
    const data = await getUserInfo()
    userInfo.value = data
  } catch (err) {
    console.error('Failed to load user info:', err)
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>
<template>
  <div class="profile-page">
    <div :class="['profile-card', 'gradient-card', 'animate-in', { failed: failed }]">
      <template v-if="loading">
        <div class="loading-spinner"></div>
        <h2>Loading...</h2>
        <p>Fetching user profile information.</p>
      </template>

      <template v-else-if="failed">
        <h2>Error</h2>
        <p>User profile information could not be fetched.</p>
        <p>Please try reloading the page.</p>
      </template>

      <template v-else>
        <div class="profile-header">
          <h2>User Profile</h2>

          <h3>
            {{ userInfo.username }}
            <span v-if="userInfo.isGuest" class="guest-tag">Guest</span>
          </h3>
        </div>

        <div class="stats-grid">
          <div class="stat">
            <span class="label">XP</span>
            <span class="value">{{ userInfo.xp }}</span>
          </div>

          <div class="stat">
            <span class="label">Rating</span>
            <span class="value">
              {{ userInfo.isGuest ? '0.0' : userInfo.rating }}
            </span>
          </div>

          <div class="stat">
            <span class="label">Win Rate</span>
            <span class="value">{{ userInfo.winRate }}%</span>
          </div>

          <div class="stat">
            <span class="label">Rank</span>

            <span :class="['value', `rank-${userInfo.rank.toLowerCase()}`]">
              {{ userInfo.rank }}
            </span>
          </div>
        </div>

        <p class="rank-note">
          {{ rankNote }}
        </p>
      </template>
    </div>

    <div v-if="!loading && !failed" class="history-card">
      <div class="history-header">
        <h3>Match History</h3>

        <div class="tab-buttons">
          <button
            :class="{ active: activeTab === 'singleplayer' }"
            @click="activeTab = 'singleplayer'"
          >
            Singleplayer
          </button>

          <button
            :class="{ active: activeTab === 'multiplayer' }"
            @click="activeTab = 'multiplayer'"
          >
            Multiplayer
          </button>
        </div>
      </div>

      <div v-if="activeHistory.length === 0" class="empty-state">
        <p>
          {{
            activeTab === 'singleplayer'
              ? 'No matches played yet. Go crack some cases!'
              : 'No multiplayer matches played yet. Challenge a friend!'
          }}
        </p>
      </div>

      <table v-else class="history-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Date</th>
            <th>Result</th>
            <th>Turns</th>
            <th>XP</th>
          </tr>
        </thead>

        <tbody>
          <MatchHistoryRow
            v-for="match in activeHistory"
            :key="match.gameId"
            :match="match"
            :multiplayer="activeTab === 'multiplayer'"
          />
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.loading-card {
  width: inherit;
  margin-left: 0.5rem;
}

.profile-card.failed h2 {
  margin: 0;
  color: red;
}

.profile-page {
  max-width: 900px;
  margin: 40px auto;
  padding: 0 20px;
}

.history-card {
  background: #1a1a1a;
  border: 1px solid #3f3f46;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  padding: 24px;
  margin-bottom: 24px;
}

.profile-card {
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;
}

.profile-header h2 {
  margin: 0;
  color: #a1a1aa;
  font-size: 1rem;
  font-weight: 600;
}

.profile-header h3 {
  margin: 8px 0 0;
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
}

.guest-tag {
  margin-left: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  font-size: 0.8rem;
  vertical-align: middle;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 18px;
  margin: 28px 0;
}

.stat {
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 10px;
  padding: 18px;
}

.label {
  display: block;
  color: #a1a1aa;
  font-size: 0.85rem;
  margin-bottom: 6px;
}

.value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #ffffff;
}

.rank-note {
  color: #d4d4d8;
  line-height: 1.5;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.history-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #ffffff;
}

.tab-buttons {
  display: flex;
  gap: 10px;
}

.tab-buttons button {
  border: 1px solid #3f3f46;
  background: #27272a;
  color: #d4d4d8;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.tab-buttons button:hover {
  background: #323238;
  border-color: #52525b;
}

.tab-buttons button.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th {
  text-align: left;
  padding: 14px 18px;
  background: #27272a;
  color: #a1a1aa;
  font-size: 0.9rem;
  font-weight: 600;
  border-bottom: 2px solid #3f3f46;
}

.history-table td {
  padding: 16px 18px;
  border-bottom: 1px solid #3f3f46;
  color: #f3f4f6;
}

.history-table tbody tr {
  transition: background-color 0.15s ease;
}

.history-table tbody tr:hover {
  background: #222225;
}

.history-table tbody tr:last-child td {
  border-bottom: none;
}

.empty-state {
  text-align: center;
  color: #a1a1aa;
  padding: 50px 20px;
}

.rank-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  padding: 6px 14px;
  border-radius: 999px;
  font-weight: 600;
}

/* Rank colors */
.rank-bronze {
  background: rgba(180, 83, 9, 0.18);
  color: #fbbf24;
}

.rank-silver {
  background: rgba(107, 114, 128, 0.18);
  color: #d1d5db;
}

.rank-gold {
  background: rgba(234, 179, 8, 0.18);
  color: #facc15;
}

.rank-platinum {
  background: rgba(6, 182, 212, 0.18);
  color: #67e8f9;
}

.rank-diamond {
  background: rgba(59, 130, 246, 0.18);
  color: #93c5fd;
}

.rank-master {
  background: rgba(147, 51, 234, 0.18);
  color: #c084fc;
}

.rank-grandmaster {
  background: rgba(220, 38, 38, 0.18);
  color: #f87171;
}
</style>
