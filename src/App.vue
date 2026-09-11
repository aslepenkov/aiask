<script setup lang="ts">
import FirestoreDemo from './components/FirestoreDemo.vue'
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>Vue 3 + Vite + Firebase + Netlify</h1>
      <p class="subtitle">A fullstack scaffold template ready for worldwide deployment via GitHub Actions</p>
    </header>

    <main>
      <FirestoreDemo />
    </main>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.header {
  margin-bottom: 2rem;
}

h1 {
  font-size: 2.2rem;
  color: #42b883;
}

.subtitle {
  color: #888;
  font-size: 1.1rem;
}
</style>
