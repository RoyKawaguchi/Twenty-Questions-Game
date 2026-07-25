<script setup>
import { computed } from 'vue'
import { PLAYER_COLORS, PLAYER_COLOR_ORDER } from '../../constants/playerColors.js'

const props = defineProps({
  players: {
    type: Array,
    required: true,
  },
  currentUsername: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['selectColor'])

const myPlayer = computed(() =>
  props.players.find((player) => player.username === props.currentUsername),
)

const myColor = computed(() => myPlayer.value?.color)

const takenColors = computed(() => {
  return new Set(props.players.map((player) => player.color))
})

const handleColorSelect = (colorId) => {
  // Already selected.
  if (colorId === myColor.value) return

  // Another player owns this color.
  if (takenColors.value.has(colorId)) return

  // Tell the parent a new color was selected.
  emit('selectColor', colorId)
}
</script>

<template>
  <div class="color-selector">
    <h5><em>Select Your Color</em></h5>

    <div class="color-grid">
      <button
        v-for="colorId in PLAYER_COLOR_ORDER"
        :key="colorId"
        class="color-circle"
        :class="{
          selected: colorId === myColor,
          disabled: takenColors.has(colorId) && colorId !== myColor,
        }"
        :style="{ backgroundColor: PLAYER_COLORS[colorId] }"
        :disabled="takenColors.has(colorId) && colorId !== myColor"
        @click="handleColorSelect(colorId)"
      >
        <span v-if="takenColors.has(colorId) && colorId !== myColor" class="slash" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.color-selector {
  background: var(--surface);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  text-align: center;
}

.color-selector h5 {
  margin-top: 0;
  margin-bottom: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
}

.color-grid {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.color-circle {
  position: relative;
  overflow: hidden;

  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid transparent;

  cursor: pointer;

  transition:
    transform 0.15s ease,
    opacity 0.15s ease,
    border-color 0.15s ease;
}

.color-circle:hover:not(:disabled) {
  transform: scale(1.08);
}

.color-circle.selected {
  border-color: #facc15;
}

.color-circle.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.slash {
  position: absolute;
  top: 50%;
  left: 50%;

  width: 150%;
  height: 3px;

  background: rgba(0, 0, 0, 0.6);

  transform: translate(-50%, -50%) rotate(-45deg);

  pointer-events: none;
}
</style>
