<script setup>
import { PLAYER_COLORS } from '../../constants/playerColors'

defineProps({
  players: {
    type: Array,
    required: true,
  },
  hostUsername: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="player-list-container">
    <h3>Players ({{ players.length }}/4)</h3>

    <div class="player-grid">
      <div
        v-for="player in players"
        :key="player.username"
        class="player-card"
        :style="{ borderLeft: `8px solid ${PLAYER_COLORS[player.color] || '#ccc'}` }"
      >
        <div class="player-info">
          <span class="username">
            {{ player.username }}
            <span v-if="player.is_guest" class="guest-tag">(Guest)</span>
          </span>
          <span v-if="player.username === hostUsername" class="host-badge">👑 Host</span>
        </div>
      </div>

      <!-- Empty slot placeholder for waiting -->
      <div v-if="players.length < 2" class="player-card empty-slot">
        <span class="pulsing-dot"></span> Waiting for players...
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-list-container {
  background: var(--surface);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  height: 100%;
  box-sizing: border-box;
}

.player-list-container h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.player-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.9rem;
  background: #111111;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.player-info {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: space-between;
}

.username {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary);
}

.guest-tag {
  font-weight: normal;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.host-badge {
  background: #ffd700;
  color: #8b6508;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: bold;
}

.empty-slot {
  border-left: 6px solid var(--border) !important;
  color: var(--text-muted);
  font-style: italic;
  justify-content: flex-start;
  gap: 10px;
}

.pulsing-dot {
  width: 10px;
  height: 10px;
  background-color: var(--text-muted);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.4;
  }
}
</style>
