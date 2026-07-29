<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { initializeSocketConnection } from '../services/socket'
import { fetchAllAnswers } from '../services/api'

const authStore = useAuthStore()

const loading = ref(true)
const failed = ref(false)

const categories = ref([])
const openCategory = ref(null)

onMounted(async () => {
  initializeSocketConnection()

  loading.value = true
  failed.value = false

  try {
    const data = await fetchAllAnswers()

    categories.value = Object.entries(data.categories).map(([title, category]) => ({
      title,
      items: category.items,
    }))
  } catch (err) {
    console.error('Failed to load answers:', err)
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="guide-page">
    <div class="guide-card gradient-card animate-in">
      <div class="guide-header">
        <h2>Game Guide</h2>
        <p>
          Everything you need to know about ::twenty. Learn the rules, explore possible answers, and
          sharpen your guessing skills.
        </p>
      </div>
      <!-- Answer Categories -->
      <section class="guide-section">
        <h3>All Possible Answers</h3>

        <p class="section-description">
          These are the possible answers currently available in each category. Click a category to
          view the answers.
        </p>

        <div class="category-list">
          <div
            v-for="category in categories"
            :key="category.title"
            class="category-card"
            @click="
              openCategory === category.title
                ? (openCategory = null)
                : (openCategory = category.title)
            "
          >
            <div class="category-header">
              <strong>{{ category.title }}</strong>

              <span class="answer-count"> {{ category.items.length }} answers </span>

              <span class="expand-icon">
                {{ openCategory === category.title ? '▲' : '▼' }}
              </span>
            </div>

            <Transition name="expand">
              <div v-if="openCategory === category.title" class="answer-list" @click.stop>
                <span v-for="item in category.items" :key="item" class="answer-pill">
                  {{ item }}
                </span>
              </div>
            </Transition>
          </div>
        </div>
      </section>

      <!-- How To Play -->
      <!-- <section class="guide-section">
        <h3>How To Play</h3>

        <div class="info-card">
          <p>Try your best!</p>

          <ol>
            <li>Instruction 1</li>
            <li>Instruction 2</li>
            <li>Instruction 3</li>
            <li>Instruction 4</li>
            <li>Instruction 5</li>
          </ol>
        </div>
      </section> -->

      <!-- FAQ -->
      <!-- <section class="guide-section">
        <h3>Frequently Asked Questions</h3>

        <div class="faq-card">
          <h4>Question 1</h4>
          <p>Answer 1</p>
          <h4>Question 2</h4>
          <p>Answer 2</p>
          <h4>Question 2</h4>
          <p>Answer 2</p>
        </div>
      </section> -->

      <!-- Feedback -->
      <section class="guide-section feedback-section">
        <h3>Improve The Game</h3>
        <RouterLink to="/feedback" class="feedback-button"> Send Feedback / Request </RouterLink>
      </section>
    </div>
  </div>
</template>

<style scoped>
.guide-page {
  max-width: 900px;
  margin: 40px auto;
  padding: 0 20px;
}

.guide-card {
  border-radius: 14px;
  padding: 24px;
}

.guide-header {
  margin-bottom: 32px;
}

.guide-header h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
}

.guide-header p {
  margin-top: 8px;
  color: #a1a1aa;
  line-height: 1.5;
}

.guide-section {
  margin-top: 32px;
}

.guide-section h3 {
  margin-bottom: 16px;
  color: #ffffff;
  font-size: 1.25rem;
}

.section-description {
  color: #a1a1aa;
  margin-bottom: 16px;
}

/* General cards */
.info-card,
.faq-card {
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  padding: 18px;
  color: #d4d4d8;
  line-height: 1.6;
}

.info-card ol {
  padding-left: 22px;
}

.info-card li {
  margin-bottom: 8px;
}

/* Categories */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-card {
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.category-card:hover {
  background: #222225;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-header strong {
  color: #ffffff;
  font-size: 1.05rem;
}

.answer-count {
  color: #a1a1aa;
  font-size: 0.9rem;
  margin-left: auto;
}

.expand-icon {
  color: #a1a1aa;
}

.answer-list {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.answer-pill {
  background: rgba(37, 99, 235, 0.15);
  color: #93c5fd;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.9rem;
}

/* FAQ */
.faq-card h4 {
  color: #ffffff;
  margin-bottom: 6px;
}

.faq-card p {
  margin-top: 0;
  margin-bottom: 20px;
}

/* Feedback */
.feedback-button {
  display: inline-block;
  margin-top: 12px;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.18);
  color: #60a5fa;
  text-decoration: none;
  font-weight: 600;
}

.feedback-button:hover {
  background: rgba(37, 99, 235, 0.3);
}

/* Expand animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
