<template>
  <el-container class="layout-container">
    <el-aside
      :width="isCollapse ? '64px' : '240px'"
      class="aside"
    >
      <div class="logo">
        <el-icon :size="24">
          <Management />
        </el-icon>
        <span v-show="!isCollapse">图书管理系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        router
        :collapse="isCollapse"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/">
          <el-icon><DataBoard /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/books">
          <el-icon><Notebook /></el-icon>
          <span>图书管理</span>
        </el-menu-item>
        <el-menu-item index="/categories">
          <el-icon><Collection /></el-icon>
          <span>分类管理</span>
        </el-menu-item>
        <el-menu-item index="/borrowers">
          <el-icon><User /></el-icon>
          <span>借阅用户</span>
        </el-menu-item>
        <el-menu-item index="/borrows">
          <el-icon><Switch /></el-icon>
          <span>借阅历史</span>
        </el-menu-item>
        <el-menu-item index="/current-borrows">
          <el-icon><Reading /></el-icon>
          <span>当前借阅</span>
        </el-menu-item>
        <el-menu-item
          v-if="userStore.isAdmin"
          index="/system-settings"
        >
          <el-icon><Setting /></el-icon>
          <span>系统管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon
            class="collapse-btn"
            @click="isCollapse = !isCollapse"
          >
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">
              首页
            </el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentRouteName }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar
                :size="32"
                src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
              />
              <span class="username">{{ userStore.user?.username }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition
            name="fade"
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../store/user';
import {
  Management,
  DataBoard,
  Notebook,
  Collection,
  User,
  Switch,
  Reading,
  Setting,
  Expand,
  Fold
} from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const isCollapse = ref(false);

const activeMenu = computed(() => route.path);
const currentRouteName = computed(() => {
  const titles: Record<string, string> = {
    '/': '仪表盘',
    '/books': '图书管理',
    '/categories': '分类管理',
    '/borrowers': '借阅用户',
    '/borrows': '借阅历史',
    '/current-borrows': '当前借阅',
    '/system-settings': '系统管理'
  };
  return titles[route.path] || '首页';
});

const handleCommand = (command: string) => {
  if (command === 'logout') {
    userStore.logout();
    router.push('/login');
  }
};
</script>

<style scoped lang="scss">
.layout-container {
  height: 100vh;
}

.aside {
  background-color: #304156;
  color: #fff;
  transition: width 0.3s;
  
  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 18px;
    font-weight: bold;
    background-color: #2b2f3a;
  }

  .el-menu {
    border-right: none;
  }
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;

  .header-left {
    display: flex;
    align-items: center;

    .collapse-btn {
      font-size: 20px;
      margin-right: 20px;
      cursor: pointer;
      &:hover {
        color: #409eff;
      }
    }
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    
    .username {
      font-size: 14px;
      color: #606266;
    }
  }
}

.main {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>
