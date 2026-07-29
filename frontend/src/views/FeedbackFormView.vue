<script setup>
import { ref } from 'vue'

const activeForm = ref('feedback')

const forms = {
  feedback: {
    title: 'Leave Feedback',
    description: 'Have suggestions or found something that could be improved? Let us know!',
    url: 'https://forms.office.com/Pages/ResponsePage.aspx?id=74FucSK1c0SOMRC9Asz25S6YC81q8MhLkNet_nLcVbJUQkY2Q0cwUlU1SjBMMUwyWFdCS0RDN0FQRC4u&embed=true',
  },
  request: {
    title: 'Submit a Request',
    description: 'Want to suggest a new category, answer, or feature? We would love to hear it!',
    url: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=74FucSK1c0SOMRC9Asz25S6YC81q8MhLkNet_nLcVbJUNUFMV0xJWUtOSU5BU01ZRUY4R0tOOTMwWC4u&embed=true',
  },
}
</script>

<template>
  <div class="feedback-page">
    <div class="feedback-container">
      <h1>Feedback & Requests</h1>

      <div class="toggle-container">
        <button :class="{ active: activeForm === 'feedback' }" @click="activeForm = 'feedback'">
          Feedback
        </button>

        <button :class="{ active: activeForm === 'request' }" @click="activeForm = 'request'">
          Requests
        </button>
      </div>

      <h2>{{ forms[activeForm].title }}</h2>

      <p class="description">
        {{ forms[activeForm].description }}
      </p>

      <iframe
        :src="forms[activeForm].url"
        frameborder="0"
        marginwidth="0"
        marginheight="0"
        allowfullscreen
        webkitallowfullscreen
        mozallowfullscreen
        msallowfullscreen
      >
      </iframe>
    </div>
  </div>
</template>

<style scoped>
.feedback-page {
  max-width: 900px;
  margin: auto;
  padding: 0 20px;
}

.feedback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 1.2rem;
  background: #18181b;
  border-radius: 14px;
}

h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.25rem);
  font-weight: 700;
  text-align: center;
  color: #f1f1f1;
}

h2 {
  margin: 0.5rem 0 0;
  font-size: 1.5rem;
  color: #ffffff;
}

.description {
  margin: 0;
  text-align: center;
  color: #a1a1aa;
  line-height: 1.5;
}

.toggle-container {
  display: flex;
  background: #27272a;
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
}

.toggle-container button {
  border: none;
  background: transparent;
  color: #a1a1aa;
  padding: 10px 24px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  transition: 0.2s ease;
}

.toggle-container button:hover {
  color: #ffffff;
}

.toggle-container button.active {
  background: rgba(37, 99, 235, 0.25);
  color: #60a5fa;
}

iframe {
  width: 100%;
  height: 80vh;
  border: none;
  border-radius: 12px;
  background: white;
}
</style>
