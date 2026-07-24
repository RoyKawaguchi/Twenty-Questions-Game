<script setup>
import { ref, computed, onMounted } from 'vue'

import { getUserInfo } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import MatchHistoryRow from '../components/MatchHistoryRow.vue'

const authStore = useAuthStore()

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
  try {
    const data = await getUserInfo()
    userInfo.value = data
  } catch (err) {
    console.error('Failed to load user info:', err)
  }
})
</script>
<template>
  <div class="profile-page" v-if="userInfo">
    <div class="profile-card">
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

          <span :class="['rank-circle', `rank-${userInfo.rank.toLowerCase()}`]">
            {{ userInfo.rank }}
          </span>
        </div>
      </div>

      <p class="rank-note">
        {{ rankNote }}
      </p>
    </div>

    <div class="history-card">
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
.profile-page {
  max-width: 900px;
  margin: 40px auto;
  padding: 0 20px;
}

.profile-card,
.history-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 24px;
  margin-bottom: 24px;
}

.profile-header h2 {
  margin: 0;
  color: #555;
  font-size: 1rem;
  font-weight: 600;
}

.profile-header h3 {
  margin: 8px 0 0;
  font-size: 2rem;
  font-weight: 700;
}

.guest-tag {
  margin-left: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #ffe6b3;
  color: #8a5800;
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
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 18px;
}

.label {
  display: block;
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 6px;
}

.value {
  font-size: 1.4rem;
  font-weight: 700;
}

.rank-note {
  color: #666;
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
}

.tab-buttons {
  display: flex;
  gap: 10px;
}

.tab-buttons button {
  border: none;
  background: #f1f1f1;
  color: #555;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.tab-buttons button:hover {
  background: #e3e3e3;
}

.tab-buttons button.active {
  background: #2d7df6;
  color: white;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th {
  text-align: left;
  padding: 14px 18px;
  background: #f7f7f7;
  color: #666;
  font-size: 0.9rem;
  font-weight: 600;
  border-bottom: 2px solid #e8e8e8;
}

.empty-state {
  text-align: center;
  color: #777;
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
</style>
