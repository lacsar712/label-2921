<template>
  <div class="publisher-detail">
    <el-page-header
      @back="goBack"
      content="出版社详情"
    />

    <el-card
      v-loading="loading"
      shadow="hover"
      class="info-card"
    >
      <template v-if="publisher">
        <div class="publisher-header">
          <div>
            <h2 class="publisher-name">{{ publisher.name }}</h2>
            <el-tag
              :type="getLevelTagType(publisher.cooperationLevel)"
              effect="dark"
              size="large"
              style="margin-top: 8px"
            >
              合作等级：{{ publisher.cooperationLevel }}级
            </el-tag>
          </div>
          <div class="header-actions">
            <el-button
              v-if="userStore.isLibrarian"
              type="primary"
              @click="handleEdit"
            >
              编辑信息
            </el-button>
          </div>
        </div>

        <el-descriptions
          :column="3"
          border
          class="info-descriptions"
        >
          <el-descriptions-item label="所在地">
            {{ publisher.location || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="邮编">
            {{ publisher.postalCode || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ publisher.phone || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="官网" :span="3">
            <el-link
              v-if="publisher.website"
              type="primary"
              :href="publisher.website"
              target="_blank"
            >
              {{ publisher.website }}
            </el-link>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-label">图书种数</div>
              <div class="stat-value">{{ publisher.statistics?.bookCount || 0 }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-label">总库存</div>
              <div class="stat-value">{{ publisher.statistics?.totalStock || 0 }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-label">累计借阅</div>
              <div class="stat-value">{{ publisher.statistics?.totalBorrows || 0 }}</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="hover" class="stat-card stat-hot">
              <div class="stat-label">近月借阅量</div>
              <div class="stat-value">{{ publisher.statistics?.recentBorrowCount || 0 }}</div>
            </el-card>
          </el-col>
        </el-row>
      </template>
    </el-card>

    <el-card
      shadow="hover"
      class="books-card"
    >
      <div class="books-header">
        <span style="font-size: 16px; font-weight: 600; color: #303133;">关联图书</span>
        <div class="sort-actions">
          <span class="sort-label">排序：</span>
          <el-radio-group
            v-model="sortBy"
            size="small"
            @change="fetchDetail"
          >
            <el-radio-button value="stock">
              库存
            </el-radio-button>
            <el-radio-button value="borrow">
              借阅量
            </el-radio-button>
          </el-radio-group>
          <el-radio-group
            v-model="sortOrder"
            size="small"
            style="margin-left: 10px"
            @change="fetchDetail"
          >
            <el-radio-button value="desc">
              降序
            </el-radio-button>
            <el-radio-button value="asc">
              升序
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

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
          prop="author"
          label="作者"
          width="120"
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
            ¥{{ row.price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="stock"
          label="库存"
          width="100"
          align="center"
          sortable
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
          prop="recentBorrows"
          label="近月借阅"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.recentBorrows > 0"
              type="warning"
              effect="plain"
            >
              {{ row.recentBorrows }}
            </el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && books.length === 0"
        description="暂无关联图书"
      />
    </el-card>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑出版社信息"
      width="500px"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <el-form-item
          label="出版社名称"
          prop="name"
        >
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="所在地">
          <el-input v-model="editForm.location" />
        </el-form-item>
        <el-form-item label="邮编">
          <el-input v-model="editForm.postalCode" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="editForm.phone" />
        </el-form-item>
        <el-form-item label="官网">
          <el-input v-model="editForm.website" placeholder="https://" />
        </el-form-item>
        <el-form-item
          label="合作等级"
          prop="cooperationLevel"
        >
          <el-select
            v-model="editForm.cooperationLevel"
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
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type { PublisherDetail, PublisherBook, CooperationLevel } from '../types';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const publisher = ref<PublisherDetail | null>(null);
const books = ref<PublisherBook[]>([]);
const sortBy = ref<'stock' | 'borrow'>('stock');
const sortOrder = ref<'desc' | 'asc'>('desc');

const editDialogVisible = ref(false);
const editSubmitting = ref(false);
const editFormRef = ref<FormInstance | null>(null);

const editForm = reactive({
  name: '',
  location: '',
  postalCode: '',
  phone: '',
  website: '',
  cooperationLevel: 'B' as CooperationLevel,
});

const editRules = {
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

const fetchDetail = async () => {
  loading.value = true;
  try {
    const id = Number(route.params.id);
    const res: any = await api.get(`/publishers/${id}`, {
      params: {
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
      },
    });
    publisher.value = res;
    books.value = res.books || [];
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/publishers');
};

const handleEdit = () => {
  if (!publisher.value) return;
  Object.assign(editForm, {
    name: publisher.value.name,
    location: publisher.value.location || '',
    postalCode: publisher.value.postalCode || '',
    phone: publisher.value.phone || '',
    website: publisher.value.website || '',
    cooperationLevel: publisher.value.cooperationLevel,
  });
  editDialogVisible.value = true;
};

const submitEdit = async () => {
  if (!editFormRef.value || !publisher.value) return;
  await editFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      editSubmitting.value = true;
      try {
        await api.put(`/publishers/${publisher.value.id}`, editForm);
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
.publisher-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card {
  .publisher-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;

    .publisher-name {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
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

      &.stat-hot {
        background: #fdf6ec;

        .stat-value {
          color: #e6a23c;
        }
      }
    }
  }
}

.books-card {
  .books-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .sort-actions {
      display: flex;
      align-items: center;

      .sort-label {
        font-size: 14px;
        color: #606266;
        margin-right: 8px;
      }
    }
  }
}
</style>
