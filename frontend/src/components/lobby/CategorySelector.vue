<script setup>
import { ref, onMounted, computed } from 'vue'
import { fetchCategories } from '../../services/api.js'

const props = defineProps({
  selectedCategory: {
    type: String,
    default: null,
  },
  isHost: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['selectCategory'])

const categories = ref([])
const loading = ref(true)

const statusMessage = computed(() => {
  if (props.isHost) {
    return 'Choose a category for this match.'
  }

  return 'Waiting for the host to select a category...'
})

function formatCategory(category) {
  return category.replaceAll('_', ' ')
}

onMounted(async () => {
  try {
    const data = await fetchCategories()
    categories.value = data.categories || []
  } catch (error) {
    console.error('Failed to load categories:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="category-section">
    <div class="section-header">
      <h3>Category</h3>

      <span v-if="isHost" class="host-badge"> Host </span>
    </div>

    <p class="description">
      {{ statusMessage }}
    </p>

    <div v-if="loading" class="loading">Loading categories...</div>

    <div v-else class="category-grid" :class="{ disabled: !isHost }">
      <button
        v-for="category in categories"
        :key="category"
        type="button"
        class="category-button"
        :class="{
          selected: selectedCategory === category,
        }"
        :disabled="!isHost"
        @click="emit('selectCategory', category)"
      >
        {{ formatCategory(category) }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.category-section {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  padding: 1rem;
  height: 100%;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.host-badge {
  background: #e8efff;
  color: #2d7df6;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.description {
  color: #777;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
}

.category-button {
  border: 1px solid #ddd;
  background: #fafafa;
  color: #444;

  padding: 0.75rem;
  border-radius: 10px;

  font-weight: 600;
  cursor: pointer;

  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.category-button:hover:not(:disabled):not(.selected) {
  background: #f0f4ff;
  border-color: #7888fc;
  transform: translateY(-2px);
}

.category-button.selected {
  background: #7888fc;
  border-color: #7888fc;
  color: white;
}

.category-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.category-grid.disabled .selected {
  opacity: 1;
  box-shadow: 0 0 0 3px rgba(120, 136, 252, 0.2);
}

.loading {
  color: #777;
  padding: 20px 0;
  text-align: center;
}
</style>
