<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { initializeSocketConnection } from '../services/socket'
import { fetchAllAnswers } from '../services/api'
import { RouterLink } from 'vue-router'

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
    <div class="guide-card gradient-card">
      <header class="guide-header">
        <h2>Game Guide</h2>
        <p>
          Everything you need to know about ::twenty. Learn the rules, explore possible answers, and
          sharpen your guessing skills.
        </p>
      </header>

      <div class="section-divider"></div>

      <section class="guide-section">
        <h3>How to Play</h3>

        <div class="mode-grid">
          <div class="info-card">
            <div class="card-header">
              <h4>
                <span class="custom-link"
                  ><RouterLink to="/singleplayer"> Singleplayer </RouterLink></span
                >
              </h4>
              <span class="mode-badge">1 player</span>
            </div>

            <ol class="step-list">
              <li><strong>Pick a Category:</strong> Animals, Countries, and more.</li>
              <li>
                <strong>Ask Yes/No questions:</strong>
                The AI responds immediately.
              </li>
              <li>
                <strong>Make Your Guess:</strong>
                Lock in your answer before 20 questions.
              </li>
              <li>
                <strong>Review AI Explanation:</strong>
                See why the AI made its decision.
              </li>
            </ol>
          </div>

          <div class="info-card">
            <div class="card-header">
              <h4>
                <span class="custom-link"
                  ><RouterLink to="/multiplayer/create"> Multiplayer </RouterLink></span
                >
              </h4>
              <span class="mode-badge multiplayer-badge"> 2-4 players </span>
            </div>

            <ol class="step-list">
              <li>
                <strong>Create a Room:</strong>
                Host a private lobby.
              </li>
              <li>
                <strong>Invite Friends:</strong>
                Share your room code.
              </li>
              <li>
                <strong>Pick a Category:</strong>
                Only the host can pick the category.
              </li>
              <li>
                <strong>Take Turns:</strong>
                One player can ask a question or make a guess in each turn.
              </li>
              <li>
                <strong>First Correct Guesser Wins:</strong>
                Wrong guesses have no penalty, so don't hold back!
              </li>
            </ol>
          </div>
        </div>
      </section>

      <div class="section-divider"></div>

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

      <div class="section-divider"></div>

      <section class="guide-section">
        <h3>FAQs</h3>

        <div class="faq-card">
          <div class="faq-item">
            <h4>
              <em
                >How does the
                <span class="custom-link"
                  ><RouterLink to="/leaderboard">leaderboard</RouterLink></span
                >
                work?</em
              >
            </h4>
            <p>
              Your rating is based on your recent games. The system rewards efficient guessing,
              consistent performance, and continued play. Keep improving, and your rating will
              follow.
            </p>
          </div>

          <div class="faq-item">
            <h4><em>Any tips for using fewer turns?</em></h4>
            <p>
              Learn the category well and ask questions that split the remaining possibilities
              roughly in half. For example, in <strong>Countries</strong>, start with continents
              (Asia, Europe, etc.) before narrowing down to regions such as East Asia or Southeast
              Asia.
            </p>

            <p>
              Look for characteristics shared by many, but not all of the answers. For example, in
              <strong>Football Players</strong>, asking whether the player is a goalkeeper,
              defender, midfielder, or attacker quickly narrows the search.
            </p>
          </div>

          <div class="faq-item">
            <h4><em>Do multiplayer games affect my leaderboard rating?</em></h4>
            <p>
              No. Multiplayer games don't affect your rating since players are naturally less
              efficient when taking turns. You still earn XP, and multiplayer games allow up to
              <strong>30 turns</strong>
              instead of 20.
            </p>
          </div>

          <div class="faq-item">
            <h4><em>Can I hide my profile from the leaderboard?</em></h4>
            <p>
              Absolutely. Head to
              <span class="custom-link"
                ><RouterLink to="/account">Account Settings</RouterLink></span
              >
              from the profile menu in the top-right corner and disable
              <strong>"Enter public leaderboard"</strong>. You can make your profile public again
              whenever you like.
            </p>
          </div>
          <div class="faq-item">
            <h4><em>What inspired ::twenty?</em></h4>
            <p>
              We talk about the background of ::twenty in detail on the
              <span class="custom-link"><RouterLink to="/about">About</RouterLink></span> page!
            </p>
          </div>
        </div>
      </section>

      <div class="section-divider"></div>

      <section class="guide-section feedback-section">
        <h3>Contact Us</h3>
        <p>
          Was your experience not satisfactory? Do you want to play categories of your expertise? We
          would love to hear from you.
        </p>

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
  border-radius: 16px;
  padding: 28px;
}

.guide-header {
  margin-bottom: 36px;
}

.guide-header h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
}

.guide-header p {
  margin-top: 10px;
  color: #a1a1aa;
  line-height: 1.6;
}

.guide-section {
  margin-top: 28px;
}

.guide-section h3 {
  margin-bottom: 14px;
  font-size: 1.3rem;
  color: #fff;
}

.section-description {
  color: #a1a1aa;
  margin-bottom: 18px;
}

.section-divider {
  height: 1px;
  background: #3f3f46;
  margin: 36px 0;
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
  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}

.category-card:hover {
  transform: translateY(-2px);
  background: #202024;
  border-color: #52525b;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-header strong {
  color: white;
}

.answer-count {
  margin-left: auto;
  color: #a1a1aa;
  font-size: 0.9rem;
}

.expand-icon {
  color: #a1a1aa;
}

/* Answers */

.answer-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.answer-pill {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.15);
  color: #93c5fd;
}

/* How to play */

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.info-card,
.faq-card {
  background: #18181b;
  border: 1px solid #3f3f46;
  border-radius: 14px;
  padding: 20px;
  color: #d4d4d8;
  line-height: 1.6;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.card-header h4 {
  margin: 0;
  font-size: 1.15rem;
}

.card-header a:hover {
  color: #60a5fa;
}

.mode-badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
  font-size: 0.8rem;
}

.multiplayer-badge {
  background: rgba(168, 85, 247, 0.15);
  color: #d8b4fe;
}

.step-list {
  padding-left: 22px;
}

.step-list li {
  margin-bottom: 10px;
}

/* FAQ */

.faq-card h4 {
  color: white;
  margin-bottom: 5px;
}

.faq-card p {
  margin-top: 0;
  margin-bottom: 20px;
}

.faq-item + .faq-item {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #3f3f46;
}

.faq-item h4 {
  margin: 0 0 10px;
  color: #fff;
  font-size: 1.05rem;
}

.faq-item p:last-child {
  margin-bottom: 0;
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
  transition: 0.2s;
}

.feedback-button:hover {
  background: rgba(37, 99, 235, 0.3);
}

/* Expand animation */

.expand-enter-active,
.expand-leave-active {
  transition: 0.2s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
