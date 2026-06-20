<template>
  <div class="author-detail">
    <el-page-header
      @back="goBack"
      content="作者详情"
    />

    <el-card
      v-loading="loading"
      shadow="hover"
      class="info-card"
    >
      <template v-if="author">
        <div class="author-header">
          <div>
            <h2 class="author-name">{{ author.name }}</h2>
            <div class="author-meta">
              <el-tag
                :type="author.status === 'ACTIVE' ? 'success' : 'danger'"
                effect="dark"
                size="large"
              >
                {{ author.status === 'ACTIVE' ? '启用' : '停用' }}
              </el-tag>
              <el-tag
                v-if="author.nationality"
                type="info"
                effect="plain"
                size="large"
                style="margin-left: 10px"
              >
                {{ author.nationality }}
              </el-tag>
              <span
                v-if="author.birthYear"
                class="life-years"
              >
                ({{ author.birthYear }}{{ author.deathYear ? ' - ' + author.deathYear : ' - 至今' }})
              </span>
            </div>
          </div>
          <div class="header-actions">
            <el-button
              v-if="userStore.isLibrarian"
              type="primary"
              @click="handleEdit"
            >
              编辑信息
            </el-button>
            <el-button
              v-if="userStore.isLibrarian"
              :type="author.status === 'ACTIVE' ? 'warning' : 'success'"
              @click="handleToggleStatus"
            >
              {{ author.status === 'ACTIVE' ? '停用作者' : '启用作者' }}
            </el-button>
          </div>
        </div>

        <el-descriptions
          :column="2"
          border
          class="info-descriptions"
        >
          <el-descriptions-item label="拼音首字母">
            {{ author.pinyinInitial || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="国籍">
            {{ author.nationality || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="生卒年份">
            <span v-if="author.birthYear">
              {{ author.birthYear }}{{ author.deathYear ? ' - ' + author.deathYear : ' - 至今' }}
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="代表作品">
            {{ author.representativeWorks || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="简介" :span="2">
            {{ author.biography || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-label">著作种数</div>
              <div class="stat-value">{{ author.statistics?.bookCount || 0 }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-label">总库存</div>
              <div class="stat-value">{{ author.statistics?.totalStock || 0 }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-label">累计借阅</div>
              <div class="stat-value">{{ author.statistics?.totalBorrows || 0 }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card stat-rating">
              <div class="stat-label">评价均值</div>
              <div class="stat-value">
                <el-rate
                  :model-value="author.statistics?.overallAvgRating || 0"
                  disabled
                  show-score
                  text-color="#ff9900"
                  score-template="{value}"
                />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </template>
    </el-card>

    <el-card
      shadow="hover"
      class="books-card"
    >
      <span style="font-size: 16px; font-weight: 600; color: #303133;">著作清单</span>

      <el-table
        v-loading="loading"
        :data="books"
        style="width: 100%; margin-top: 16px"
        border
        stripe
      >
        <el-table-column
          prop="title"
          label="书名"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          prop="isbn"
          label="ISBN"
          width="140"
        />
        <el-table-column
          prop="category"
          label="分类"
          width="120"
        />
        <el-table-column
          prop="price"
          label="价格"
          width="100"
        >
          <template #default="{ row }">
            ¥{{ row.price?.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="stock"
          label="库存"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-tag :type="row.stock > 0 ? 'success' : 'danger'">
              {{ row.stock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="totalBorrows"
          label="累计借阅"
          width="100"
          align="center"
          sortable
        />
        <el-table-column
          label="评价"
          width="180"
          align="center"
        >
          <template #default="{ row }">
            <div v-if="row.reviewCount > 0" class="rating-cell">
              <el-rate
                :model-value="row.avgRating"
                disabled
                size="small"
              />
              <span class="rating-text">{{ row.avgRating }} ({{ row.reviewCount }})</span>
            </div>
            <span v-else class="no-rating">暂无评价</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && books.length === 0"
        description="暂无关联著作"
      />
    </el-card>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑作者信息"
      width="560px"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <el-form-item
          label="作者姓名"
          prop="name"
        >
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="国籍">
          <el-input v-model="editForm.nationality" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出生年份">
              <el-input-number
                v-model="editForm.birthYear"
                :min="0"
                :max="2100"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="逝世年份">
              <el-input-number
                v-model="editForm.deathYear"
                :min="0"
                :max="2100"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="简介">
          <el-input
            v-model="editForm.biography"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="代表作品">
          <el-input
            v-model="editForm.representativeWorks"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="editSubmitting"
          @click="submitEdit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type { AuthorDetail, AuthorBook } from '../types';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const author = ref<AuthorDetail | null>(null);
const books = ref<AuthorBook[]>([]);

const editDialogVisible = ref(false);
const editSubmitting = ref(false);
const editFormRef = ref<FormInstance | null>(null);

const editForm = reactive({
  name: '',
  nationality: '',
  birthYear: undefined as number | undefined,
  deathYear: undefined as number | undefined,
  biography: '',
  representativeWorks: '',
});

const editRules = {
  name: [{ required: true, message: '请输入作者姓名', trigger: 'blur' }],
};

const fetchDetail = async () => {
  loading.value = true;
  try {
    const id = Number(route.params.id);
    const res: any = await api.get(`/authors/${id}`);
    author.value = res;
    books.value = res.books || [];
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/authors');
};

const handleEdit = () => {
  if (!author.value) return;
  Object.assign(editForm, {
    name: author.value.name,
    nationality: author.value.nationality || '',
    birthYear: author.value.birthYear,
    deathYear: author.value.deathYear,
    biography: author.value.biography || '',
    representativeWorks: author.value.representativeWorks || '',
  });
  editDialogVisible.value = true;
};

const handleToggleStatus = () => {
  if (!author.value) return;
  const newStatus = author.value.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  const action = newStatus === 'DISABLED' ? '停用' : '启用';
  ElMessageBox.confirm(
    `确定要${action}作者"${author.value.name}"吗？${newStatus === 'DISABLED' ? '停用后新图书将无法挂靠该作者，历史借阅关联保留。' : ''}`,
    '确认',
    { type: 'warning' },
  ).then(async () => {
    try {
      await api.patch(`/authors/${author.value!.id}/status`, { status: newStatus });
      ElMessage.success(`${action}成功`);
      fetchDetail();
    } catch {
      ElMessage.error(`${action}失败`);
    }
  });
};

const submitEdit = async () => {
  if (!editFormRef.value || !author.value) return;
  await editFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      editSubmitting.value = true;
      try {
        const payload: any = { ...editForm };
        if (!payload.nationality) delete payload.nationality;
        if (!payload.birthYear) delete payload.birthYear;
        if (!payload.deathYear) delete payload.deathYear;
        if (!payload.biography) delete payload.biography;
        if (!payload.representativeWorks) delete payload.representativeWorks;

        await api.put(`/authors/${author.value!.id}`, payload);
        ElMessage.success('更新成功');
        editDialogVisible.value = false;
        fetchDetail();
      } finally {
        editSubmitting.value = false;
      }
    }
  });
};

onMounted(fetchDetail);
</script>

<style scoped lang="scss">
.author-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card {
  .author-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;

    .author-name {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    .author-meta {
      display: flex;
      align-items: center;
      margin-top: 8px;
      gap: 4px;

      .life-years {
        font-size: 14px;
        color: #909399;
        margin-left: 10px;
      }
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }
  }

  .info-descriptions {
    margin-bottom: 24px;
  }

  .stats-row {
    .stat-card {
      text-align: center;
      border: none;
      background: #f5f7fa;

      .stat-label {
        font-size: 14px;
        color: #909399;
        margin-bottom: 8px;
      }

      .stat-value {
        font-size: 28px;
        font-weight: 600;
        color: #303133;
      }

      &.stat-rating {
        background: #fdf6ec;

        .stat-value {
          font-size: 16px;
          display: flex;
          justify-content: center;
        }
      }
    }
  }
}

.books-card {
  .rating-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;

    .rating-text {
      font-size: 12px;
      color: #909399;
    }
  }

  .no-rating {
    font-size: 12px;
    color: #c0c4cc;
  }
}
</style>
