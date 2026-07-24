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
  transition: background 0.15s;
}

.history-row:hover {
  background: #fafafa;
}

td {
  padding: 14px 18px;
  border-bottom: 1px solid #eee;
}

.result-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.win {
  background: #dff6e5;
  color: #1c7c38;
}

.loss {
  background: #ffe4e4;
  color: #c53b3b;
}
</style>
