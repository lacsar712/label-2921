<template>
  <div class="authors-container">
    <el-card shadow="hover">
      <div class="header-actions">
        <span style="font-size: 16px; font-weight: 600; color: #303133;">作者管理</span>
        <div class="right-actions">
          <el-input
            v-model="search"
            placeholder="搜索作者姓名、简介"
            style="width: 220px; margin-right: 10px"
            clearable
            @clear="fetchAuthors"
            @keyup.enter="fetchAuthors"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="filterPinyin"
            placeholder="拼音首字母"
            clearable
            style="width: 130px; margin-right: 10px"
            @change="fetchAuthors"
          >
            <el-option
              v-for="letter in pinyinLetters"
              :key="letter"
              :label="letter"
              :value="letter"
            />
          </el-select>
          <el-select
            v-model="filterNationality"
            placeholder="国籍"
            clearable
            style="width: 120px; margin-right: 10px"
            @change="fetchAuthors"
          >
            <el-option
              v-for="n in nationalities"
              :key="n"
              :label="n"
              :value="n"
            />
          </el-select>
          <el-select
            v-model="filterStatus"
            placeholder="状态"
            clearable
            style="width: 110px; margin-right: 10px"
            @change="fetchAuthors"
          >
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="DISABLED" />
          </el-select>
          <el-button
            v-if="userStore.isLibrarian"
            type="primary"
            :icon="Plus"
            @click="handleAdd"
          >
            新增作者
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="authors"
        style="width: 100%; margin-top: 20px"
        border
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="70"
          align="center"
        />
        <el-table-column
          label="作者姓名"
          min-width="140"
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
          prop="pinyinInitial"
          label="拼音"
          width="80"
          align="center"
        />
        <el-table-column
          prop="nationality"
          label="国籍"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            {{ row.nationality || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="生卒年份"
          width="140"
          align="center"
        >
          <template #default="{ row }">
            <span v-if="row.birthYear">
              {{ row.birthYear }}{{ row.deathYear ? ' - ' + row.deathYear : ' -' }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="representativeWorks"
          label="代表作品"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.representativeWorks || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="著作数"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="info">{{ row.bookCount ?? row._count?.bookAuthors ?? 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'ACTIVE' ? 'success' : 'danger'"
              effect="dark"
            >
              {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="240"
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
              v-if="userStore.isLibrarian"
              link
              :type="row.status === 'ACTIVE' ? 'warning' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'ACTIVE' ? '停用' : '启用' }}
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

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchAuthors"
          @current-change="fetchAuthors"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑作者' : '新增作者'"
      width="560px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item
          label="作者姓名"
          prop="name"
        >
          <el-input v-model="form.name" placeholder="请输入作者姓名" />
        </el-form-item>
        <el-form-item label="国籍">
          <el-input v-model="form.nationality" placeholder="如：中国、美国" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出生年份">
              <el-input-number
                v-model="form.birthYear"
                :min="0"
                :max="2100"
                style="width: 100%"
                placeholder="如：1965"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="逝世年份">
              <el-input-number
                v-model="form.deathYear"
                :min="0"
                :max="2100"
                style="width: 100%"
                placeholder="留空表示在世"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="简介">
          <el-input
            v-model="form.biography"
            type="textarea"
            :rows="3"
            placeholder="请输入作者简介"
          />
        </el-form-item>
        <el-form-item label="代表作品">
          <el-input
            v-model="form.representativeWorks"
            type="textarea"
            :rows="2"
            placeholder="如：《作品1》、《作品2》"
          />
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
import type { Author } from '../types';

const router = useRouter();
const userStore = useUserStore();
const authors = ref<Author[]>([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const search = ref('');
const filterPinyin = ref('');
const filterNationality = ref('');
const filterStatus = ref('');
const nationalities = ref<string[]>([]);
const pinyinLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const dialogVisible = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance | null>(null);
const isEdit = ref(false);
const editId = ref<number | null>(null);

const form = reactive({
  name: '',
  nationality: '',
  birthYear: undefined as number | undefined,
  deathYear: undefined as number | undefined,
  biography: '',
  representativeWorks: '',
});

const rules = {
  name: [{ required: true, message: '请输入作者姓名', trigger: 'blur' }],
};

const fetchNationalities = async () => {
  try {
    const res: any = await api.get('/authors/nationalities');
    nationalities.value = res;
  } catch {
    nationalities.value = [];
  }
};

const fetchAuthors = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (search.value) params.search = search.value;
    if (filterPinyin.value) params.pinyinInitial = filterPinyin.value;
    if (filterNationality.value) params.nationality = filterNationality.value;
    if (filterStatus.value) params.status = filterStatus.value;
    const res: any = await api.get('/authors', { params });
    authors.value = res.data || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
};

const goToDetail = (row: Author) => {
  router.push(`/authors/${row.id}`);
};

const handleAdd = () => {
  isEdit.value = false;
  editId.value = null;
  Object.assign(form, {
    name: '',
    nationality: '',
    birthYear: undefined,
    deathYear: undefined,
    biography: '',
    representativeWorks: '',
  });
  dialogVisible.value = true;
};

const handleEdit = (row: Author) => {
  isEdit.value = true;
  editId.value = row.id;
  Object.assign(form, {
    name: row.name,
    nationality: row.nationality || '',
    birthYear: row.birthYear,
    deathYear: row.deathYear,
    biography: row.biography || '',
    representativeWorks: row.representativeWorks || '',
  });
  dialogVisible.value = true;
};

const handleToggleStatus = (row: Author) => {
  const newStatus = row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  const action = newStatus === 'DISABLED' ? '停用' : '启用';
  ElMessageBox.confirm(
    `确定要${action}作者"${row.name}"吗？${newStatus === 'DISABLED' ? '停用后新图书将无法挂靠该作者，历史借阅关联保留。' : ''}`,
    '确认',
    { type: 'warning' },
  ).then(async () => {
    try {
      await api.patch(`/authors/${row.id}/status`, { status: newStatus });
      ElMessage.success(`${action}成功`);
      fetchAuthors();
    } catch {
      ElMessage.error(`${action}失败`);
    }
  });
};

const handleDelete = (row: Author) => {
  ElMessageBox.confirm(
    `确定要删除作者"${row.name}"吗？已关联图书的作者无法删除。`,
    '警告',
    { type: 'warning' },
  ).then(async () => {
    try {
      await api.delete(`/authors/${row.id}`);
      ElMessage.success('删除成功');
      fetchAuthors();
    } catch {
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
        const payload: any = { ...form };
        if (!payload.nationality) delete payload.nationality;
        if (!payload.birthYear) delete payload.birthYear;
        if (!payload.deathYear) delete payload.deathYear;
        if (!payload.biography) delete payload.biography;
        if (!payload.representativeWorks) delete payload.representativeWorks;

        if (isEdit.value && editId.value) {
          await api.put(`/authors/${editId.value}`, payload);
          ElMessage.success('更新成功');
        } else {
          await api.post('/authors', payload);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        fetchAuthors();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

onMounted(() => {
  fetchAuthors();
  fetchNationalities();
});
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  .right-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0;
  }
}

.pagination-row {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
