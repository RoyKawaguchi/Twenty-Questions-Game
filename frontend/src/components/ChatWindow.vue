<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useRoomStore } from '../stores/roomStore.js'
import { PLAYER_COLORS } from '../constants/playerColors.js'

const props = defineProps({
  messages: {
    type: Array,
    required: true,
  },
  showAnalysis: {
    type: Boolean,
    default: false,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const gameStore = useGameStore()
const roomStore = useRoomStore()
const chatWindowRef = ref(null)

// Look up player color in roomStore or default to standard blue
function getPlayerColor(username) {
  if (!username) return '#007aff'
  if (gameStore.gameMode == 'SINGLEPLAYER') {
    return '#007aff'
  } else {
    const player = roomStore.players.find((p) => p.username === username)
    return PLAYER_COLORS[player.color] || '#007aff'
  }
}

async function scrollToBottom() {
  await nextTick()
  if (chatWindowRef.value) {
    chatWindowRef.value.scrollTop = chatWindowRef.value.scrollHeight
  }
}

onMounted(scrollToBottom)
watch(() => [props.messages, props.isLoading], scrollToBottom, { deep: true })
</script>

<template>
  <div ref="chatWindowRef" class="chat-window">
    <div
      v-for="message in messages"
      :key="message.id"
      :class="[
        'message-row',
        message.sender === 'ai' || message.sender === 'system' ? 'message-ai' : 'message-user',
      ]"
    >
      <div
        :class="[
          'chat-bubble',
          message.sender === 'ai'
            ? 'bubble-ai'
            : message.sender === 'system'
              ? 'bubble-system'
              : 'bubble-user',
        ]"
        :style="
          message.sender !== 'ai' && message.sender !== 'system'
            ? { backgroundColor: getPlayerColor(message.sender) }
            : {}
        "
      >
        <div v-if="message.type === 'instruction'" class="message-label">SYSTEM</div>

        <div v-else-if="message.type === 'question'" class="message-label">
          {{ `Question · ${message.sender.toUpperCase()}` }}
        </div>

        <div v-else-if="message.type === 'guess'" class="message-label">
          {{ `Guess · ${message.sender.toUpperCase()}` }}
        </div>

        <div v-else-if="message.type === 'response'" class="message-label">AI</div>

        <div>{{ message.text }}</div>

        <div
          v-if="showAnalysis && message.type === 'response' && message.analysis"
          class="analysis-box"
        >
          <strong>AI Analysis:</strong>
          <p>{{ message.analysis }}</p>
        </div>
      </div>
    </div>

    <!-- Typing Indicator -->
    <div v-if="isLoading" class="message-row message-ai">
      <div class="chat-bubble bubble-ai">
        <div class="message-label">AI</div>
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.chat-window {
  flex: 1;
  min-height: 50vh;
  overflow-y: auto;

  padding: 1.5rem 1rem;

  display: flex;
  flex-direction: column;
  gap: 16px;

  background-color: #212121;

  border-radius: 24px;
  border: 1px solid #3f3f46;

  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.35);
}
.message-row {
  display: flex;
  width: 100%;
}

.message-user {
  justify-content: flex-end;
}

.message-ai {
  justify-content: flex-start;
}

.chat-bubble {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 20px;
  line-height: 1.45;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  position: relative;
}

/* User: Dynamic color via :style, default blue fallback */
.bubble-user {
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

/* AI */
.bubble-ai {
  background: #1a1a1a;
  color: #f3f4f6;
  border: 1px solid #3f3f46;
  border-bottom-left-radius: 4px;
}

/* System */
.bubble-system {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
}

.message-label {
  font-size: 0.7rem;
  font-weight: 700;
  margin-bottom: 4px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.bubble-user .message-label {
  color: rgba(255, 255, 255, 0.85);
}

.bubble-ai .message-label {
  color: #a1a1aa;
}

.bubble-system .message-label {
  color: #f59e0b;
}

.analysis-box {
  margin-top: 12px;
  padding: 12px;
  background: #27272a;
  border-left: 3px solid #60a5fa;
  border-radius: 0 8px 8px 0;
  font-size: 0.85rem;
  color: #d4d4d8;
}

.analysis-box strong {
  display: block;
  margin-bottom: 4px;
  color: #ffffff;
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 4px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #71717a;
  animation: typingBounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typingBounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

@media (min-width: 600px) {
  .chat-bubble {
    max-width: 70%;
  }
}
</style>
