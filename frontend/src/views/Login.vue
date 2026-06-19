<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="login-header">
          <h2>图书管理系统</h2>
          <p>请登录您的账号</p>
        </div>
      </template>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            :loading="loading"
            block
            class="submit-btn"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-footer">
        <p>默认账号: admin / 123456</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/user';
import { User, Lock } from '@element-plus/icons-vue';
import api from '../api';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';

const router = useRouter();
const userStore = useUserStore();
const formRef = ref<FormInstance | null>(null);
const loading = ref(false);

const form = reactive({
  username: '',
  password: ''
});

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const handleLogin = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true;
      try {
        const res: any = await api.post('/auth/login', form);
        userStore.setAuth(res.token, res.user);
        ElMessage.success('登录成功');
        router.push('/');
      } catch (error) {
        // Error handled by axios interceptor
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style scoped lang="scss">
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);

  .login-header {
    text-align: center;
    h2 {
      margin: 0;
      color: #333;
    }
    p {
      margin: 8px 0 0;
      color: #999;
      font-size: 14px;
    }
  }

  .submit-btn {
    width: 100%;
    height: 40px;
    font-size: 16px;
    margin-top: 10px;
  }

  .login-footer {
    text-align: center;
    margin-top: 20px;
    font-size: 12px;
    color: #999;
  }
}
</style>
