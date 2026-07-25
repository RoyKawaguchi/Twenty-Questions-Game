<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore.js'
import { useRoomStore } from '../stores/roomStore.js'

const props = defineProps({
  mode: {
    type: String,
    default: 'SINGLEPLAYER', // 'SINGLEPLAYER' or 'MULTIPLAYER'
  },
  gameOverData: {
    type: Object,
    required: true,
  },
  turnsUsed: {
    type: Number,
    required: true,
  },
  maxQuestions: {
    type: Number,
    required: true,
  },
  showAnalysis: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle-analysis', 'leave-game'])

const authStore = useAuthStore()
const roomStore = useRoomStore()

const isWin = computed(() => props.gameOverData.result === 'WIN')
const isForfeit = computed(() => props.gameOverData.forfeit)

// Extracts the current logged-in user's stats from the stats dict/object
const myStats = computed(() => {
  const stats = props.gameOverData.stats
  if (!stats) return {}

  // If MP, stats is keyed by username: { "Roy": { ... }, "John": { ... } }
  if (props.mode === 'MULTIPLAYER' && stats[authStore.username]) {
    return stats[authStore.username]
  }
  return stats
})

// Maps roomStore.players with individual q & g submitted from backend stats
const mpPlayerResults = computed(() => {
  return roomStore.players.map((p) => {
    const playerStat = props.gameOverData.stats?.[p.username]
    return {
      username: p.username,
      questionsSubmitted: playerStat?.questionsSubmitted ?? null,
      guessesSubmitted: playerStat?.guessesSubmitted ?? null,
      isWinner: p.username === props.gameOverData.winnerUsername,
    }
  })
})
</script>

<template>
  <div class="game-over-panel gradient-card animate-in">
    <!-- Zone 1: Outcome & Secret Answer Hero -->
    <div class="outcome-header">
      <h3 :class="isWin ? 'outcome-win' : 'outcome-loss'">
        {{ isWin ? '🎉 Victory!' : '❌ Defeat' }}
      </h3>

      <div class="secret-answer-card">
        <span class="card-label">SECRET ANSWER</span>
        <div class="answer-text">{{ gameOverData.secretAnswer }}</div>
      </div>

      <p v-if="isForfeit" class="forfeit-notice">Game ended by forfeit.</p>

      <!-- Victory Sub-message -->
      <p v-else-if="isWin" class="sub-message">
        <strong v-if="mode === 'MULTIPLAYER'">{{ gameOverData.winnerUsername }}</strong>
        <span v-else>You</span> figured out the answer in <strong>{{ turnsUsed }}</strong>
        {{ turnsUsed === 1 ? 'turn' : 'turns' }}!
      </p>

      <!-- Defeat Sub-message in Multiplayer -->
      <p v-else-if="mode === 'MULTIPLAYER' && gameOverData.winnerUsername" class="sub-message">
        <strong>{{ gameOverData.winnerUsername }}</strong> guessed the secret answer!
      </p>
    </div>

    <!-- Zone 2: Match Highlights (Grid) -->
    <div class="match-summary-grid">
      <div class="stat-card highlight">
        <span class="stat-label">XP Earned</span>
        <span class="stat-value">+{{ myStats.xpEarned || 0 }}</span>
        <span v-if="authStore.isGuest" class="stat-subtext">(Guest)</span>
      </div>

      <div v-if="mode === 'MULTIPLAYER'" class="stat-card">
        <span class="stat-label">Your Turns</span>
        <span class="stat-value">{{
          myStats.questionsSubmitted + myStats.guessesSubmitted || 0
        }}</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">{{ mode === 'MULTIPLAYER' ? 'Room Turns' : 'Turns Used' }}</span>
        <span class="stat-value">{{ turnsUsed }} / {{ maxQuestions }}</span>
      </div>
    </div>

    <!-- Zone 3: SINGLEPLAYER Career Stats -->
    <div v-if="mode === 'SINGLEPLAYER'" class="career-stats-container">
      <div class="career-stat">
        <span class="c-label">Rank</span>
        <span class="c-value">{{ myStats.rank || '-' }}</span>
      </div>
      <div class="career-stat">
        <span class="c-label">Total XP</span>
        <span class="c-value">{{ myStats.xp || 0 }}</span>
      </div>
      <div class="career-stat">
        <span class="c-label">Win Rate</span>
        <span class="c-value">{{ myStats.winRate || '0%' }}</span>
      </div>
      <div class="career-stat">
        <span class="c-label">Efficiency Score</span>
        <span class="c-value">{{ myStats.avgTurnsToWin || '-' }}</span>
      </div>
    </div>

    <!-- Zone 3: MULTIPLAYER Room Summary -->
    <div v-else-if="mode === 'MULTIPLAYER'" class="mp-summary-container">
      <h4 class="mp-summary-title">Room Results</h4>
      <div class="mp-player-list">
        <div
          v-for="(member, index) in mpPlayerResults"
          :key="member.username"
          class="mp-player-row"
        >
          <div class="mp-player-name">
            <span class="mp-rank">{{ index + 1 }}</span>
            <span>{{ member.username }}</span>
            <span v-if="member.isWinner" class="mp-winner-crown">👑</span>
          </div>
          <span class="mp-player-turns">
            {{
              `${member.questionsSubmitted} question${member.questionsSubmitted === 1 ? '' : 's'} ${member.guessesSubmitted} guess${member.guessesSubmitted === 1 ? '' : 'es'}`
            }}
          </span>
        </div>
      </div>
    </div>

    <!-- Zone 4: Actions -->
    <div class="game-over-actions">
      <button class="btn-secondary" @click="emit('toggle-analysis')">
        {{ showAnalysis ? 'Hide Analysis' : 'Show Analysis' }}
      </button>
      <button class="btn-primary" @click="emit('leave-game')">
        {{ mode === 'SINGLEPLAYER' ? 'Return Home' : 'Return to Lobby' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.game-over-panel {
  flex-shrink: 0;
  margin: 1.5rem 1rem;
  padding: 2rem;
  border-radius: 20px;
  text-align: center;
  max-width: 500px;
  width: calc(100% - 2rem);
  align-self: center;
}

.outcome-header h3 {
  font-size: 2rem;
  margin: 0 0 1rem 0;
  font-weight: 800;
}

.outcome-win {
  color: #4ade80;
}

.outcome-loss {
  color: #f87171;
}

.secret-answer-card {
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  margin: 0 auto 1rem auto;
  max-width: 320px;
}

.secret-answer-card .card-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}

.secret-answer-card .answer-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.sub-message,
.forfeit-notice {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.forfeit-notice {
  color: #f87171;
  font-weight: 600;
}

.match-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 12px;
  margin-bottom: 1.5rem;
}

.stat-subtext {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.stat-card {
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-card.highlight {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.3);
}

.stat-card.highlight .stat-value {
  color: #4ade80;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-primary);
}

.career-stats-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  background: var(--surface-alt);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  margin-bottom: 1.5rem;
}

.career-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.c-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
}

.c-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.mp-summary-container {
  background: var(--surface-alt);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  margin-bottom: 1.5rem;
  text-align: left;
}

.mp-summary-title {
  margin: 0 0 12px 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mp-player-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mp-player-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #111111;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.95rem;
}

.mp-player-name {
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.mp-rank {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 700;
  width: 16px;
}

.mp-player-turns {
  font-weight: 500;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.game-over-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.game-over-actions button {
  flex: 1;
  padding: 0.8rem 1.25rem;
  border-radius: 24px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary {
  background-color: var(--accent-indigo);
  color: #ffffff;
  border: none;
}

.btn-primary:hover {
  background-color: var(--accent-indigo-hover);
}

.btn-secondary {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background-color: var(--surface-alt);
}

.game-over-actions button:active {
  transform: scale(0.97);
}

@media (max-width: 600px) {
  .game-over-panel {
    margin: 1.5rem 0;
    width: 100%;
    border-radius: 0;
    border-left: none;
    border-right: none;
    box-shadow: none;
    padding: 1.5rem 1rem;
  }
}
</style>
