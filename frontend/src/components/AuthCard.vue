<template>
  <div class="auth-card">
    <slot></slot>
  </div>
</template>
<style scoped>
.auth-card {
  max-width: 600px;
  margin: 50px auto;
  padding: 32px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  text-align: center;
  color: var(--text-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

:deep(input) {
  display: block;
  width: 100%;
  margin: 10px 0;
  padding: 10px 12px;
  background: #111111;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
}

:deep(input:focus) {
  outline: none;
  border-color: var(--accent-indigo);
  box-shadow: 0 0 0 3px rgba(120, 136, 252, 0.15);
}

/* Prevent autofill from making input white */
:deep(input:-webkit-autofill),
:deep(input:-webkit-autofill:hover),
:deep(input:-webkit-autofill:focus),
:deep(input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 1000px #111111 inset !important;
  -webkit-text-fill-color: #fff !important;
  border: 1px solid var(--border);
  caret-color: #fff;
  transition: background-color 9999s ease-in-out 0s;
}

:deep(button) {
  width: 100%;
  padding: 10px;
  margin-top: 6px;
  background: var(--accent-indigo);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

:deep(button:hover) {
  background: var(--accent-indigo-hover);
}

:deep(.link-to-auth) {
  font-weight: bold;
  text-decoration: underline;
}
</style>
