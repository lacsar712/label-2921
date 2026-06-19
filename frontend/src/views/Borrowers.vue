<template>
  <div class="borrowers-container">
    <el-card shadow="hover">
      <div class="header-actions">
        <span style="font-size: 16px; font-weight: 600; color: #303133;">借阅用户管理</span>
        <div class="right-actions">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索姓名、电话或邮箱"
            :prefix-icon="Search"
            clearable
            style="width: 250px; margin-right: 12px"
          />
          <el-button
            type="primary"
            @click="openDialog('create')"
          >
            <el-icon><Plus /></el-icon>
            新增借阅用户
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="filteredBorrowers"
        style="width: 100%; margin-top: 20px"
        border
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="80"
        />
        <el-table-column
          prop="name"
          label="姓名"
          min-width="120"
        />
        <el-table-column
          prop="phone"
          label="电话"
          min-width="120"
        />
        <el-table-column
          prop="email"
          label="邮箱"
          min-width="150"
        />
        <el-table-column
          label="当前借阅"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="row._count.borrows > 0 ? 'warning' : 'info'">
              {{ row._count.borrows }}
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
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="viewBorrows(row)"
            >
              查看借阅
            </el-button>
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
              :disabled="row._count.borrows > 0"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑借阅用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增借阅用户' : '编辑借阅用户'"
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
          label="姓名"
          prop="name"
        >
          <el-input
            v-model="form.name"
            placeholder="请输入姓名"
          />
        </el-form-item>
        <el-form-item
          label="电话"
          prop="phone"
        >
          <el-input
            v-model="form.phone"
            placeholder="请输入电话"
          />
        </el-form-item>
        <el-form-item
          label="邮箱"
          prop="email"
        >
          <el-input
            v-model="form.email"
            placeholder="请输入邮箱"
          />
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

    <!-- 用户借阅详情对话框 -->
    <el-dialog
      v-model="borrowsDialogVisible"
      title="借阅用户借阅详情"
      width="800px"
    >
      <div
        v-if="currentUser"
        class="user-info"
      >
        <el-descriptions
          :column="2"
          border
        >
          <el-descriptions-item label="姓名">
            {{ currentUser.name }}
          </el-descriptions-item>
          <el-descriptions-item label="电话">
            {{ currentUser.phone || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ currentUser.email || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <el-divider />
      <el-table
        v-loading="borrowsLoading"
        :data="userBorrows"
        style="width: 100%"
        border
        stripe
      >
        <el-table-column
          prop="book.title"
          label="书名"
          min-width="150"
        />
        <el-table-column
          prop="book.author"
          label="作者"
          width="120"
        />
        <el-table-column
          prop="book.isbn"
          label="ISBN"
          width="130"
        />
        <el-table-column
          prop="book.category.name"
          label="分类"
          width="100"
        />
        <el-table-column
          prop="borrowDate"
          label="借阅时间"
          width="180"
        >
          <template #default="{ row }">
            {{ formatDate(row.borrowDate) }}
          </template>
        </el-table-column>
      </el-table>
      <div
        v-if="!borrowsLoading && userBorrows.length === 0"
        class="empty-state"
      >
        <el-empty description="暂无借阅记录" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import api from '../api';
import type { FormInstance, FormRules } from 'element-plus';

const borrowers = ref<any[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const submitting = ref(false);
const formRef = ref<FormInstance>();

const borrowsDialogVisible = ref(false);
const userBorrows = ref<any[]>([]);
const borrowsLoading = ref(false);
const currentUser = ref<any>(null);
const searchKeyword = ref('');

const filteredBorrowers = computed(() => {
  if (!searchKeyword.value) return borrowers.value;
  const keyword = searchKeyword.value.toLowerCase();
  return borrowers.value.filter(b => 
    b.name.toLowerCase().includes(keyword) || 
    (b.phone && b.phone.toLowerCase().includes(keyword)) ||
    (b.email && b.email.toLowerCase().includes(keyword))
  );
});

const form = reactive({
  name: '',
  phone: '',
  email: ''
});

const rules: FormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, message: '姓名至少2个字符', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
};

const fetchBorrowers = async () => {
  loading.value = true;
  try {
    const res: any = await api.get('/borrowers');
    borrowers.value = res;
  } finally {
    loading.value = false;
  }
};

const openDialog = (mode: 'create' | 'edit', borrower?: any) => {
  dialogMode.value = mode;
  if (mode === 'edit' && borrower) {
    currentUser.value = borrower;
    form.name = borrower.name;
    form.phone = borrower.phone || '';
    form.email = borrower.email || '';
  } else {
    currentUser.value = null;
    form.name = '';
    form.phone = '';
    form.email = '';
  }
  dialogVisible.value = true;
};

const resetForm = () => {
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    submitting.value = true;
    try {
      const data = {
        name: form.name,
        phone: form.phone,
        email: form.email
      };

      if (dialogMode.value === 'create') {
        await api.post('/borrowers', data);
        ElMessage.success('创建成功');
      } else if (currentUser.value) {
        await api.put(`/borrowers/${currentUser.value.id}`, data);
        ElMessage.success('更新成功');
      }
      
      dialogVisible.value = false;
      fetchBorrowers();
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || (dialogMode.value === 'create' ? '创建失败' : '更新失败'));
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async (borrower: any) => {
  if (borrower._count.borrows > 0) {
    ElMessage.warning('该用户有未归还的图书，无法删除');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除借阅用户 "${borrower.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await api.delete(`/borrowers/${borrower.id}`);
    ElMessage.success('删除成功');
    fetchBorrowers();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const viewBorrows = async (borrower: any) => {
  currentUser.value = borrower;
  borrowsDialogVisible.value = true;
  borrowsLoading.value = true;
  
  try {
    const res: any = await api.get(`/borrowers/${borrower.id}/borrows`);
    userBorrows.value = res;
  } finally {
    borrowsLoading.value = false;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

onMounted(fetchBorrowers);
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.right-actions {
  display: flex;
  align-items: center;
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
