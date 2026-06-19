<template>
  <div class="categories-container">
    <el-card shadow="hover">
      <div class="header-actions">
        <span style="font-size: 16px; font-weight: 600; color: #303133;">分类管理</span>
        <el-button
          v-if="userStore.isLibrarian"
          type="primary"
          :icon="Plus"
          @click="handleAdd"
        >
          新增分类
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="categories"
        style="width: 100%; margin-top: 20px"
        border
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="100"
          align="center"
        />
        <el-table-column
          prop="name"
          label="分类名称"
          min-width="200"
        />
        <el-table-column
          label="操作"
          width="200"
          align="center"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="userStore.isLibrarian"
              link
              type="primary"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="userStore.isAdmin"
              link
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分类' : '新增分类'"
      width="400px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item
          label="名称"
          prop="name"
        >
          <el-input v-model="form.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitForm"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';

const userStore = useUserStore();
const categories = ref<any[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance | null>(null);
const isEdit = ref(false);
const editId = ref<number | null>(null);

const form = reactive({ name: '' });
const rules = { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] };

const fetchCategories = async () => {
  loading.value = true;
  try {
    const res: any = await api.get('/categories');
    categories.value = res;
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  isEdit.value = false;
  editId.value = null;
  form.name = '';
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  editId.value = row.id;
  form.name = row.name;
  dialogVisible.value = true;
};

const handleDelete = (row: any) => {
  ElMessageBox.confirm('删除分类可能会影响相关图书，确定吗？', '警告', { type: 'warning' }).then(async () => {
    try {
      await api.delete(`/categories/${row.id}`);
      ElMessage.success('删除成功');
      fetchCategories();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitLoading.value = true;
      try {
        if (isEdit.value && editId.value) {
          await api.put(`/categories/${editId.value}`, form);
          ElMessage.success('更新成功');
        } else {
          await api.post('/categories', form);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        fetchCategories();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

onMounted(fetchCategories);
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
