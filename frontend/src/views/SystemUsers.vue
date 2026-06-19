<template>
  <div class="system-users-container">
    <el-card shadow="hover">
      <template #header>
        <div class="header-actions">
          <h3>系统用户管理</h3>
          <el-button
            type="primary"
            @click="openDialog('create')"
          >
            <el-icon><Plus /></el-icon>
            新增系统用户
          </el-button>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="users"
        style="width: 100%"
        border
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="80"
        />
        <el-table-column
          prop="username"
          label="用户名"
          min-width="120"
        />
        <el-table-column
          prop="role"
          label="角色"
          width="120"
        >
          <template #default="{ row }">
            <el-tag :type="row.role === 'ADMIN' ? 'danger' : 'primary'">
              {{ row.role === 'ADMIN' ? '管理员' : '图书管理员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="创建时间"
          width="180"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="150"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openDialog('edit', row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              :disabled="!canDelete(row)"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑系统用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增系统用户' : '编辑系统用户'"
      width="500px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item
          label="用户名"
          prop="username"
        >
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item
          label="密码"
          prop="password"
        >
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
          <div
            v-if="dialogMode === 'edit'"
            class="form-tip"
          >
            留空则不修改密码
          </div>
        </el-form-item>
        <el-form-item
          label="角色"
          prop="role"
        >
          <el-select
            v-model="form.role"
            placeholder="请选择角色"
          >
            <el-option
              label="图书管理员"
              value="LIBRARIAN"
            />
            <el-option
              label="管理员"
              value="ADMIN"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import api from '../api';
import type { FormInstance, FormRules } from 'element-plus';

const users = ref<any[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const submitting = ref(false);
const formRef = ref<FormInstance>();

const adminCount = computed(() => {
  return users.value.filter(u => u.role === 'ADMIN').length;
});

const form = reactive({
  username: '',
  password: '',
  role: 'LIBRARIAN'
});

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少3个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
};

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res: any = await api.get('/users');
    users.value = res;
  } finally {
    loading.value = false;
  }
};

const canDelete = (user: any) => {
  if (user.role === 'ADMIN' && adminCount.value <= 1) return false;
  return true;
};

const openDialog = (mode: 'create' | 'edit', user?: any) => {
  dialogMode.value = mode;
  if (mode === 'edit' && user) {
    form.username = user.username;
    form.password = '';
    form.role = user.role;
  } else {
    form.username = '';
    form.password = '';
    form.role = 'LIBRARIAN';
  }
  dialogVisible.value = true;
};

const resetForm = () => {
  formRef.value?.resetFields();
  form.password = '';
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    submitting.value = true;
    try {
      const data: any = {
        username: form.username,
        role: form.role
      };
      if (form.password) {
        data.password = form.password;
      }

      if (dialogMode.value === 'create') {
        await api.post('/users', data);
        ElMessage.success('创建成功');
      } else {
        const user = users.value.find(u => u.username === form.username);
        if (user) {
          await api.put(`/users/${user.id}`, data);
          ElMessage.success('更新成功');
        }
      }
      
      dialogVisible.value = false;
      fetchUsers();
    } catch (error) {
      ElMessage.error(dialogMode.value === 'create' ? '创建失败' : '更新失败');
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async (user: any) => {
  if (!canDelete(user)) {
    ElMessage.warning('无法删除该用户');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.username}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await api.delete(`/users/${user.id}`);
    ElMessage.success('删除成功');
    fetchUsers();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

onMounted(fetchUsers);
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  h3 { margin: 0; }
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.user-info {
  margin-bottom: 20px;
}

.empty-state {
  padding: 40px 0;
}
</style>
