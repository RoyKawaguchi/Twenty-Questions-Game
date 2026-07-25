<script setup>
defineProps({
  match: {
    type: Object,
    required: true,
  },
})

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString()
}
</script>

<template>
  <tr class="history-row">
    <td>
      <strong>{{ match.category }}</strong>
    </td>

    <td>{{ formatDate(match.played_at) }}</td>

    <td>
      <span :class="['result-pill', match.result.toLowerCase() === 'win' ? 'win' : 'loss']">
        {{ match.result }}
      </span>
    </td>

    <td>{{ match.turns_used }}</td>

    <td>{{ match.xp_earned }}</td>
  </tr>
</template>
<style scoped>
.history-row {
  transition: background-color 0.15s ease;
}

.history-row:hover {
  background: #222225;
}

td {
  padding: 14px 18px;
  border-bottom: 1px solid #3f3f46;
  color: #f3f4f6;
}

.result-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.win {
  background: rgba(34, 197, 94, 0.18);
  color: #4ade80;
}

.loss {
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
}
</style>
