<template>
  <div class="auth-card">
    <slot></slot> <!-- This is where your page-specific content will appear -->
  </div>
</template>

<style scoped>
.auth-card {
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  background: #1a1a1a;
  border-radius: 8px;
  text-align: center;
  color: white;
}

/* Define your shared input/button styles here once! */
:deep(input) {
  display: block;
  width: 100%;
  margin: 10px 0;
  padding: 10px;
  background: #333;
  border: 1px solid #444;
  color: white;
}

:deep(button) {
  width: 100%;
  padding: 10px;
  background: #00ffcc;
  border: none;
  cursor: pointer;
}
</style>