<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    },
    {
      threshold: 0.15,
    },
  )

  document.querySelectorAll('.reveal').forEach((el) => {
    observer.observe(el)
  })
})
</script>

<template>
  <div class="about-container">
    <!-- HERO BANNER -->
    <header class="hero-banner">
      <div class="hero-content">
        <h1 class="logo logo-title">::twenty</h1>
        <p class="tagline">
          The classic 20-questions game—flipped on its head with conversational AI.
        </p>
      </div>
    </header>

    <main class="content-wrapper">
      <!-- PURPOSE & OVERVIEW SECTION -->
      <section class="info-card reveal purpose-card">
        <h2>What is ::twenty?</h2>
        <p>
          <strong>::twenty</strong> brings a modern, AI twist to the timeless guessing game of
          <strong>20 Questions</strong>. The goal is simple: narrow down the secret answer by asking
          efficient yes-or-no questions before your turns run out.
        </p>
        <p>
          You can aim to top the leaderboard by playing singleplayer mode , or flex your deductive
          skills to your friends by playing multiplayer mode .
        </p>
      </section>

      <!-- HOW TO PLAY SECTION -->
      <section class="section-block">
        <h2 class="section-heading">How to Play</h2>

        <div class="grid-two-col">
          <!-- SINGLEPLAYER -->
          <div class="info-card reveal mode-card">
            <div class="card-header">
              <h3>
                <span class="custom-link">
                  <RouterLink to="/singleplayer">Singleplayer</RouterLink>
                </span>
              </h3>
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

          <!-- MULTIPLAYER -->
          <div class="info-card reveal mode-card">
            <div class="card-header">
              <h3>
                <span class="custom-link">
                  <RouterLink to="/multiplayer/create">Multiplayer</RouterLink>
                </span>
              </h3>
              <span class="mode-badge multiplayer-badge">2-4 Players</span>
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

      <!-- ORIGIN & MOTIVATION SECTION -->
      <section class="section-block">
        <h2 class="section-heading">The Vision & Motivation</h2>
        <div class="grid-two-col">
          <!-- ORIGIN IDEA -->
          <div class="info-card reveal">
            <h3>Flipping the Script on Akinator</h3>
            <p class="card-text">
              <strong>::twenty</strong> takes heavy inspiration from the all-time classic,
              <span class="custom-link"
                ><em
                  ><a href="https://en.akinator.com/" target="_blank" rel="noopener noreferrer"
                    >Akinator</a
                  ></em
                ></span
              >, the virtual genie that guesses the character you are thinking of.
            </p>
            <p class="card-text">
              However, as fun as it is to see it guess the exact character, wouldn't you want to
              play as the Akinator himself?
            </p>
            <p class="card-text">
              That's why <strong>::twenty</strong> flipped this dynamic on its head. Instead of the
              AI guessing your secret, <em>you</em> have to guess what the AI is thinking of by
              using pure logic and deduction.
            </p>
          </div>

          <!-- BRAIN NOURISHMENT -->
          <div class="info-card reveal">
            <h3>Brain Rotting ➡ Brain Nourishment</h3>
            <p class="card-text">
              In this godforesaken era filled with short-form, dopamine-gushing, brain-rotting
              social media contents,
              <strong>::twenty</strong> was designed to offer meaningful entertainment.
            </p>
            <p class="card-text">
              It replaces your endless doomscrolling with engaging
              <strong><em>brain nourishment</em></strong> that sharpens your deductive skills, on
              top of knowledge of organism taxonomy, and global geography in a modern, competitive
              environment.
            </p>
            <p class="card-text">
              Next time you are farting around on your phone, go on <strong>::twenty</strong>! Your
              brain will thank you.
            </p>
          </div>
        </div>
      </section>

      <!-- WHY AI WAS NECESSARY -->
      <section class="section-block">
        <div class="info-card reveal highlight-card">
          <h3>Why AI? Solving the Impossible</h3>
          <p class="card-text">
            Why am I using AI in a game even though it destroys the planet? Thank you for asking.
          </p>
          <p class="card-text">
            Before modern LLMs, building a fluid 20-questions game was practically impossible.
            Standard decision trees and keyword algorithms fall into issues with inputs like:
          </p>
          <ul class="step-list">
            <li>
              <strong>Spelling errors </strong>(e.g.,<em
                >"Phillipines", "Philipines", "Phillippines"</em
              >)
            </li>
            <li>
              <strong>Regional synonyms </strong>
              (e.g., <em>"flashlight"</em> vs. <em>"torch"</em>,
              <em>"couch"</em> vs.<em>"sofa"</em>)
            </li>
            <li>
              <strong>Creative questions </strong>
              (e.g., <em>"Does this footballer play in the Camel League?"</em>)
            </li>
            <li>
              <strong>Creative guesses </strong>
              (e.g., <em>"CR7"</em> or <em>"Penaldo"</em> instead of "Cristiano Ronaldo")
            </li>
          </ul>
          <p class="card-text">
            By leveraging strict backend prompt engineering, <strong>::twenty</strong> accurately
            judges subtle nuances, sleng-like phrasing, and complex logic in real-time.
          </p>
          <p class="card-text">So go ahead, be creative with your questions!</p>
        </div>
      </section>

      <!-- TECH STACK & CREATOR SECTION -->
      <section class="section-block">
        <div class="grid-two-col">
          <!-- TECH STACK -->
          <div class="info-card reveal">
            <h3>Tech Architecture</h3>
            <ul class="tech-tags">
              <li>Vue.js</li>
              <li>Python / Flask</li>
              <li>WebSockets</li>
              <li>MongoDB</li>
              <li>OpenAI API</li>
            </ul>
            <ul class="step-list">
              <li>
                Single-page Vue.js frontend handling client-side state management, routing, and
                interactive UI rendering.
              </li>
              <li>
                Flask backend manages authentication, game logic, match state, player analytics, and
                real-time multiplayer synchronization via WebSockets.
              </li>
              <li>
                MongoDB Atlas stores user and game data with TTL cleanup for abandoned sessions,
                while the OpenAI API provides semantic evaluation of player guesses.
              </li>
            </ul>
          </div>

          <!-- ABOUT CREATOR -->
          <div class="info-card reveal creator-card">
            <h3>About the Creator</h3>
            <p>
              Hi, I'm <strong>Roy Kawaguchi</strong>, a Computer Science student based in Tokyo!
            </p>
            <p>
              I built <strong>::twenty</strong> to learn how to build a full-stack web app using
              WebSockets. I noticed that high-quality, LLM-integrated games are hard to find right
              now—most are either poorly made or don't exist yet—and I thought I had something to
              offer.
            </p>
            <p>I hope you enjoy<strong>::twenty</strong> as much I do!</p>
            <a
              href="https://github.com/RoyKawaguchi/Twenty-Questions-Game"
              target="_blank"
              rel="noopener noreferrer"
              class="github-btn"
            >
              <svg class="github-icon" viewBox="0 0 24 24" width="25" height="25">
                <path
                  fill="currentColor"
                  d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
                />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* GENERAL LAYOUT */
.about-container {
  min-height: 100vh;
  color: #f3f4f6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  padding-bottom: 4rem;
}

.content-wrapper {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* HERO BANNER */
.hero-banner {
  background: linear-gradient(200deg, #111111 0%, #1a1a1a 100%);
  border-bottom: 3px solid #27272a;
  padding: 4.5rem 1.5rem 3.5rem;
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-title {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  margin: 0 0 0.5rem 0;
  color: #ffffff;
}

.logo-medium {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  margin: 0 0 0.5rem 0;
  padding-right: 5px;
  color: #ffffff;
}

.tagline {
  font-size: 1.25rem;
  color: #a1a1aa;
  margin: 0;
  font-weight: 400;
}

/* CARDS & SECTIONS */
.section-block {
  margin-bottom: 2rem;
}

.section-heading {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #ffffff;
}

.info-card {
  background: #1a1a1a;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  padding: 1.75rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}

.info-card h3 {
  margin-top: 0;
  font-size: 1.25rem;
  color: #ffffff;
  margin-bottom: 0.75rem;
}

.card-text {
  line-height: 1.6;
  color: #d4d4d8;
  margin-bottom: 0.75rem;
}

.card-text:last-child {
  margin-bottom: 0;
}

.purpose-card {
  margin-bottom: 2rem;
  line-height: 1.6;
  font-size: 1.1rem;
}

.purpose-card h2 {
  margin-top: 0;
  font-size: 1.5rem;
  color: #ffffff;
}

.highlight-card {
  border-left: 4px solid #2563eb;
}

.accent-text {
  color: #60a5fa;
  font-family: monospace, monospace;
}

/* GRID LAYOUTS */
.grid-two-col {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .grid-two-col {
    grid-template-columns: 1fr 1fr;
  }
}

/* GAME MODES */
.card-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.mode-badge {
  background-color: rgba(37, 99, 235, 0.15);
  color: #60a5fa;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.6rem;
  border-radius: 9999px;
  text-transform: uppercase;
}

.multiplayer-badge {
  background-color: rgba(220, 38, 38, 0.15);
  color: #f87171;
}

.step-list {
  padding-left: 1.25rem;
  margin: 0;
  line-height: 1.6;
  color: #d4d4d8;
}

.step-list li {
  margin-bottom: 0.75rem;
}

.step-list li:last-child {
  margin-bottom: 0;
}

/* TECH STACK & CREATOR */
.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}

.tech-tags li {
  background-color: #27272a;
  color: #e5e7eb;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  border: 1px solid #3f3f46;
}

.tech-description {
  font-size: 0.9rem;
  color: #a1a1aa;
  margin: 1;
  line-height: 1.5;
}

.creator-card p {
  line-height: 1.6;
  color: #d4d4d8;
  margin-bottom: 1.5rem;
}

.github-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #000000;
  color: #ffffff;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

.github-btn:hover {
  background-color: #333333;
}

.github-icon {
  fill: currentColor;
}

/* Reveal animation */
/* SCROLL REVEAL */
.reveal {
  opacity: 0;
  transform: translateY(40px);
  transition:
    opacity 0.7s ease,
    transform 0.7s ease;
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* optional: nicer stagger effect */
.grid-two-col .reveal:nth-child(2) {
  transition-delay: 0.15s;
}
</style>
