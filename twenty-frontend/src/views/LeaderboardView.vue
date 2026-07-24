<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { getLeaderboard } from '../services/api'

const authStore = useAuthStore()

const leaderboard = ref([])

onMounted(async () => {
  try {
    const data = await getLeaderboard()
    leaderboard.value = data.leaderboard || []
  } catch (err) {
    console.error('Failed to load leaderboard:', err)
  }
})
</script>

<template>
  <div class="leaderboard-page">
    <div class="leaderboard-card">
      <div class="leaderboard-header">
        <div>
          <h2>Leaderboard</h2>
          <p>
            Top investigators ranked by rating. Rankings are updated daily based on overall
            performance.
          </p>
        </div>
      </div>

      <div v-if="leaderboard.length === 0" class="empty-state">
        <p>No ranked investigators found yet. Complete 5 matches to claim your spot!</p>
      </div>

      <table v-else class="leaderboard-table">
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

.leaderboard-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 24px;
}

.leaderboard-header {
  margin-bottom: 24px;
}

.leaderboard-header h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}

.leaderboard-header p {
  margin-top: 8px;
  color: #666;
  line-height: 1.5;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
}

.leaderboard-table th {
  text-align: left;
  padding: 14px 18px;
  background: #f7f7f7;
  color: #666;
  font-size: 0.9rem;
  font-weight: 600;
  border-bottom: 2px solid #e8e8e8;
}

.leaderboard-table td {
  padding: 16px 18px;
  border-bottom: 1px solid #eee;
}

.leaderboard-table tbody tr {
  transition: background 0.15s ease;
}

.leaderboard-table tbody tr:hover {
  background: #fafafa;
}

.leaderboard-table tbody tr:last-child td {
  border-bottom: none;
}

.position {
  font-weight: 700;
  width: 80px;
}

.username {
  font-weight: 600;
}

.currentUser {
  background: #f5f9ff;
}

.currentUser:hover {
  background: #edf5ff !important;
}

.you-tag {
  margin-left: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #dcebff;
  color: #2d7df6;
  font-size: 0.75rem;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  color: #777;
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
</style>
