<template>
  <div class="system-settings-container">
    <el-tabs
      v-model="activeTab"
      type="border-card"
    >
      <!-- 系统用户管理 Tab -->
      <el-tab-pane
        label="系统用户管理"
        name="users"
      >
        <div class="tab-content">
          <div class="header-actions">
            <h3>系统用户管理</h3>
            <el-button
              type="primary"
              @click="openUserDialog('create')"
            >
              <el-icon><Plus /></el-icon>
              新增系统用户
            </el-button>
          </div>

          <el-table
            v-loading="usersLoading"
            :data="users"
            style="width: 100%; margin-top: 16px"
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
                  @click="openUserDialog('edit', row)"
                >
                  编辑
                </el-button>
                <el-button
                  link
                  type="danger"
                  :disabled="!canDeleteUser(row)"
                  @click="handleDeleteUser(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 系统基本信息 Tab -->
      <el-tab-pane
        label="系统基本信息"
        name="settings"
      >
        <div class="tab-content">
          <h3>系统基本信息</h3>
          <el-descriptions
            :column="1"
            border
            style="margin-top: 20px"
          >
            <el-descriptions-item label="系统名称">
              {{ settingsForm.systemName }}
            </el-descriptions-item>
            <el-descriptions-item label="图书馆名称">
              {{ settingsForm.libraryName }}
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              {{ settingsForm.contactPhone || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="联系邮箱">
              {{ settingsForm.contactEmail || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="系统公告">
              {{ settingsForm.announcement || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="最大借阅天数">
              {{ settingsForm.maxBorrowDays }} 天
            </el-descriptions-item>
            <el-descriptions-item label="最大借阅数量">
              {{ settingsForm.maxBorrowCount }} 本
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增/编辑系统用户对话框 -->
    <el-dialog
      v-model="userDialogVisible"
      :title="userDialogMode === 'create' ? '新增系统用户' : '编辑系统用户'"
      width="500px"
      @close="resetUserForm"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userRules"
        label-width="80px"
      >
        <el-form-item
          label="用户名"
          prop="username"
        >
          <el-input
            v-model="userForm.username"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item
          label="密码"
          prop="password"
        >
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
          <div
            v-if="userDialogMode === 'edit'"
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
            v-model="userForm.role"
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
        <el-button @click="userDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="userSubmitting"
          @click="handleSubmitUser"
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

const activeTab = ref('users');

// 系统用户管理相关
const users = ref<any[]>([]);
const usersLoading = ref(false);
const userDialogVisible = ref(false);
const userDialogMode = ref<'create' | 'edit'>('create');
const userSubmitting = ref(false);
const userFormRef = ref<FormInstance>();



const adminCount = computed(() => {
  return users.value.filter(u => u.role === 'ADMIN').length;
});

const userForm = reactive({
  username: '',
  password: '',
  role: 'LIBRARIAN'
});

const userRules: FormRules = {
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

// 系统设置相关
const settingsForm = reactive({
  systemName: '图书管理系统',
  libraryName: '默认图书馆',
  contactPhone: '',
  contactEmail: '',
  announcement: '',
  maxBorrowDays: 30,
  maxBorrowCount: 5
});

const fetchUsers = async () => {
  usersLoading.value = true;
  try {
    const res: any = await api.get('/users');
    users.value = res;
  } finally {
    usersLoading.value = false;
  }
};

const canDeleteUser = (user: any) => {
  if (user.role === 'ADMIN' && adminCount.value <= 1) return false;
  return true;
};

const openUserDialog = (mode: 'create' | 'edit', user?: any) => {
  userDialogMode.value = mode;
  if (mode === 'edit' && user) {
    userForm.username = user.username;
    userForm.password = '';
    userForm.role = user.role;
  } else {
    userForm.username = '';
    userForm.password = '';
    userForm.role = 'LIBRARIAN';
  }
  userDialogVisible.value = true;
};

const resetUserForm = () => {
  userFormRef.value?.resetFields();
  userForm.password = '';
};

const handleSubmitUser = async () => {
  if (!userFormRef.value) return;
  
  await userFormRef.value.validate(async (valid) => {
    if (!valid) return;
    
    userSubmitting.value = true;
    try {
      const data: any = {
        username: userForm.username,
        role: userForm.role
      };
      if (userForm.password) {
        data.password = userForm.password;
      }

      if (userDialogMode.value === 'create') {
        await api.post('/users', data);
        ElMessage.success('创建成功');
      } else {
        const user = users.value.find(u => u.username === userForm.username);
        if (user) {
          await api.put(`/users/${user.id}`, data);
          ElMessage.success('更新成功');
        }
      }
      
      userDialogVisible.value = false;
      fetchUsers();
    } catch (error) {
      ElMessage.error(userDialogMode.value === 'create' ? '创建失败' : '更新失败');
    } finally {
      userSubmitting.value = false;
    }
  });
};

const handleDeleteUser = async (user: any) => {
  if (!canDeleteUser(user)) {
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



const loadSettings = () => {
  const saved = localStorage.getItem('systemSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(settingsForm, parsed);
      if (settingsForm.systemName && settingsForm.systemName.endsWith('de')) {
        settingsForm.systemName = settingsForm.systemName.slice(0, -2);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchUsers();
  loadSettings();
});
</script>

<style scoped lang="scss">
.system-settings-container {
  .tab-content {
    padding: 20px;
  }

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

  .empty-state {
    padding: 40px 0;
  }
}
</style>
