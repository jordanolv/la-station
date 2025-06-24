<template>
  <div class="app min-h-screen bg-gray-900 text-white">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// Clean App component - all routing logic is now in the router
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
