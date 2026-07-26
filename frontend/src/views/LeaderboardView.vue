<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { initializeSocketConnection } from '../services/socket'
import { getLeaderboard } from '../services/api'
import { logout } from '../services/authService.js'

const authStore = useAuthStore()

const loading = ref(true)
const failed = ref(false)

const leaderboard = ref([])

onMounted(async () => {
  try {
    initializeSocketConnection()
  } catch (error) {
    alert('Session ran out. Please login again!')
    logout()
  }

  loading.value = true
  failed.value = false
  try {
    const data = await getLeaderboard()
    leaderboard.value = data.leaderboard || []
  } catch (err) {
    console.error('Failed to load leaderboard:', err)
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="leaderboard-page">
    <div class="leaderboard-card gradient-card animate-in">
      <div class="leaderboard-header">
        <div>
          <h2>Leaderboard</h2>
          <p>
            Top investigators ranked by rating. Rankings are updated daily based on overall
            performance.
          </p>
        </div>
      </div>

      <div v-if="loading" class="status-card loading-card">
        <div class="loading-spinner"></div>
        <h2>Loading...</h2>
        <p>Fetching leaderboard information.</p>
      </div>

      <div v-else-if="failed" class="failed-card loading-card">
        <h2>Error</h2>
        <p>Leaderboard information could not be fetched.</p>
        <p>Please try reloading the page.</p>
      </div>

      <div v-else-if="leaderboard.length === 0" class="empty-state">
        <p>No ranked investigators found yet. Complete 5 matches to claim your spot!</p>
      </div>

      <table v-else-if="true" class="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Investigator</th>
            <th>XP</th>
            <th>Rating</th>
            <th>Rank</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="entry in leaderboard"
            :key="entry.username"
            :class="{ currentUser: entry.username === authStore.username }"
          >
            <td class="position">#{{ entry.position }}</td>

            <td class="username">
              {{ entry.username }}

              <span v-if="entry.username === authStore.username" class="you-tag"> You </span>
            </td>

            <td>{{ entry.xp }}</td>

            <td>
              <strong>{{ entry.rating }}</strong>
            </td>

            <td>
              <span :class="['rank-circle', `rank-${entry.rank.toLowerCase()}`]">
                {{ entry.rank }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-page {
  max-width: 900px;
  margin: 40px auto;
  padding: 0 20px;
}

.loading-card {
  width: inherit;
  margin-left: 0.5rem;
}

.leaderboard-card {
  border-radius: 14px;
  padding: 24px;
}

.leaderboard-header {
  margin-bottom: 24px;
}

.leaderboard-header h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
}

.leaderboard-header p {
  margin-top: 8px;
  color: #a1a1aa;
  line-height: 1.5;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
}

.leaderboard-table th {
  text-align: left;
  padding: 14px 18px;
  background: #27272a;
  color: #a1a1aa;
  font-size: 0.9rem;
  font-weight: 600;
  border-bottom: 2px solid #3f3f46;
}

.leaderboard-table td {
  padding: 16px 18px;
  border-bottom: 1px solid #3f3f46;
  color: #f3f4f6;
}

.leaderboard-table tbody tr {
  transition: background-color 0.15s ease;
}

.leaderboard-table tbody tr:hover {
  background: #222225;
}

.leaderboard-table tbody tr:last-child td {
  border-bottom: none;
}

.position {
  font-weight: 700;
  width: 80px;
  color: #ffffff;
}

.username {
  font-weight: 600;
}

.currentUser {
  background: rgba(37, 99, 235, 0.12);
}

.currentUser:hover {
  background: rgba(37, 99, 235, 0.18) !important;
}

.you-tag {
  margin-left: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.18);
  color: #60a5fa;
  font-size: 0.75rem;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  color: #a1a1aa;
  padding: 60px 20px;
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
