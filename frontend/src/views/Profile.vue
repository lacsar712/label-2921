<template>
  <div class="profile-container">
    <el-card
      class="profile-card"
      header="个人中心"
    >
      <div class="user-info">
        <el-avatar
          :size="100"
          src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
        />
        <div class="info-details">
          <div class="info-item">
            <span class="label">用户名：</span>
            <span class="value">{{ userStore.user?.username }}</span>
          </div>
          <div class="info-item">
            <span class="label">角色：</span>
            <el-tag :type="userStore.user?.role === 'ADMIN' ? 'danger' : 'success'">
              {{ userStore.user?.role === 'ADMIN' ? '管理员' : '图书管理员' }}
            </el-tag>
          </div>
        </div>
      </div>
      
      <el-divider />
      
      <div class="actions">
        <el-button
          type="primary"
          @click="goBack"
        >
          返回首页
        </el-button>
        <el-button
          type="danger"
          @click="handleLogout"
        >
          退出登录
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/user';

const router = useRouter();
const userStore = useUserStore();

const goBack = () => {
  router.push('/');
};

const handleLogout = () => {
  userStore.logout();
  router.push('/login');
};
</script>

<style scoped lang="scss">
.profile-container {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.profile-card {
  width: 100%;
  max-width: 600px;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 20px 0;

  .info-details {
    width: 100%;
    max-width: 300px;
    
    .info-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
      font-size: 16px;
      
      .label {
        color: #909399;
      }
      
      .value {
        color: #303133;
        font-weight: bold;
      }
    }
  }
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}
</style>
