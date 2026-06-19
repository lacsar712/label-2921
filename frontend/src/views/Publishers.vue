<template>
  <div class="publishers-container">
    <el-card shadow="hover">
      <div class="header-actions">
        <span style="font-size: 16px; font-weight: 600; color: #303133;">出版社管理</span>
        <div class="right-actions">
          <el-input
            v-model="search"
            placeholder="搜索出版社名称或所在地"
            style="width: 240px; margin-right: 10px"
            clearable
            @clear="fetchPublishers"
            @keyup.enter="fetchPublishers"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="filterLevel"
            placeholder="合作等级"
            clearable
            style="width: 120px; margin-right: 10px"
            @change="fetchPublishers"
          >
            <el-option label="A级" value="A" />
            <el-option label="B级" value="B" />
            <el-option label="C级" value="C" />
            <el-option label="D级" value="D" />
          </el-select>
          <el-button
            v-if="userStore.isLibrarian"
            type="primary"
            :icon="Plus"
            @click="handleAdd"
          >
            新增出版社
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="publishers"
        style="width: 100%; margin-top: 20px"
        border
        stripe
      >
        <el-table-column
          prop="name"
          label="出版社名称"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-link
              type="primary"
              @click="goToDetail(row)"
            >
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column
          prop="location"
          label="所在地"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          prop="postalCode"
          label="邮编"
          width="100"
        />
        <el-table-column
          prop="phone"
          label="联系电话"
          width="140"
        />
        <el-table-column
          prop="website"
          label="官网"
          min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-link
              v-if="row.website"
              type="primary"
              :href="row.website"
              target="_blank"
            >
              {{ row.website }}
            </el-link>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="cooperationLevel"
          label="合作等级"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="getLevelTagType(row.cooperationLevel)"
              effect="dark"
            >
              {{ row.cooperationLevel }}级
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="bookCount"
          label="图书种数"
          width="100"
          align="center"
        />
        <el-table-column
          prop="totalStock"
          label="总库存"
          width="100"
          align="center"
        />
        <el-table-column
          prop="recentBorrowCount"
          label="近月借阅量"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.recentBorrowCount > 0"
              type="warning"
              effect="plain"
            >
              {{ row.recentBorrowCount }}
            </el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          align="center"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="goToDetail(row)"
            >
              详情
            </el-button>
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
      :title="isEdit ? '编辑出版社' : '新增出版社'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item
          label="出版社名称"
          prop="name"
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="所在地">
          <el-input v-model="form.location" />
        </el-form-item>
        <el-form-item label="邮编">
          <el-input v-model="form.postalCode" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="官网">
          <el-input v-model="form.website" placeholder="https://" />
        </el-form-item>
        <el-form-item
          label="合作等级"
          prop="cooperationLevel"
        >
          <el-select
            v-model="form.cooperationLevel"
            style="width: 100%"
          >
            <el-option label="A级" value="A" />
            <el-option label="B级" value="B" />
            <el-option label="C级" value="C" />
            <el-option label="D级" value="D" />
          </el-select>
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
import { Search, Plus } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type { Publisher, CooperationLevel } from '../types';

const router = useRouter();
const userStore = useUserStore();
const publishers = ref<Publisher[]>([]);
const loading = ref(false);
const search = ref('');
const filterLevel = ref('');
const dialogVisible = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance | null>(null);
const isEdit = ref(false);
const editId = ref<number | null>(null);

const form = reactive({
  name: '',
  location: '',
  postalCode: '',
  phone: '',
  website: '',
  cooperationLevel: 'B' as CooperationLevel,
});

const rules = {
  name: [{ required: true, message: '请输入出版社名称', trigger: 'blur' }],
  cooperationLevel: [{ required: true, message: '请选择合作等级', trigger: 'change' }],
};

const getLevelTagType = (level: string) => {
  const map: Record<string, string> = {
    A: 'success',
    B: 'primary',
    C: 'warning',
    D: 'info',
  };
  return map[level] || 'info';
};

const fetchPublishers = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (search.value) params.search = search.value;
    if (filterLevel.value) params.cooperationLevel = filterLevel.value;
    const res: any = await api.get('/publishers', { params });
    publishers.value = res;
  } finally {
    loading.value = false;
  }
};

const goToDetail = (row: Publisher) => {
  router.push(`/publishers/${row.id}`);
};

const handleAdd = () => {
  isEdit.value = false;
  editId.value = null;
  Object.assign(form, {
    name: '',
    location: '',
    postalCode: '',
    phone: '',
    website: '',
    cooperationLevel: 'B' as CooperationLevel,
  });
  dialogVisible.value = true;
};

const handleEdit = (row: Publisher) => {
  isEdit.value = true;
  editId.value = row.id;
  Object.assign(form, {
    name: row.name,
    location: row.location || '',
    postalCode: row.postalCode || '',
    phone: row.phone || '',
    website: row.website || '',
    cooperationLevel: row.cooperationLevel,
  });
  dialogVisible.value = true;
};

const handleDelete = (row: Publisher) => {
  ElMessageBox.confirm('删除该出版社可能会影响相关数据，确定吗？', '警告', { type: 'warning' }).then(async () => {
    try {
      await api.delete(`/publishers/${row.id}`);
      ElMessage.success('删除成功');
      fetchPublishers();
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
          await api.put(`/publishers/${editId.value}`, form);
          ElMessage.success('更新成功');
        } else {
          await api.post('/publishers', form);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        fetchPublishers();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

onMounted(fetchPublishers);
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .right-actions {
    display: flex;
    align-items: center;
  }
}
</style>
