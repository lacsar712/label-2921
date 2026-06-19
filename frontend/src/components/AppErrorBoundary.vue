<template>
  <div>
    <slot v-if="!hasError" />
    <div
      v-else
      class="error-fallback"
    >
      <el-result
        icon="warning"
        title="页面出错了"
        sub-title="请尝试刷新或返回首页"
      >
        <template #extra>
          <el-button
            type="primary"
            @click="reload"
          >
            刷新页面
          </el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';

const hasError = ref(false);

onErrorCaptured((err) => {
  console.error(err);
  hasError.value = true;
  return false;
});

const reload = () => window.location.reload();
</script>

<style scoped>
.error-fallback {
  padding: 40px;
}
</style>
