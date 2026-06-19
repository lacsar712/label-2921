<template>
  <AppErrorBoundary>
    <router-view v-slot="{ Component }">
      <transition
        name="fade"
        mode="out-in"
      >
        <component :is="Component" />
      </transition>
    </router-view>
  </AppErrorBoundary>
</template>

<script setup lang="ts">
import AppErrorBoundary from './components/AppErrorBoundary.vue';
</script>

<style>
/* Global styles are in styles/index.scss */
</style>
