<template>
  <div class="borrows-container">
    <el-card shadow="hover">
      <template #header>
        <div class="header-actions">
          <h3>借阅历史</h3>
          <div class="search-box">
            <el-input
              v-model="searchQuery"
              placeholder="搜索书名或借阅人"
              clearable
              style="width: 250px"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="filteredBorrows"
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
          prop="borrower.name"
          label="借阅人"
          width="120"
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
        <el-table-column
          prop="returnDate"
          label="还书时间"
          width="180"
        >
          <template #default="{ row }">
            {{ row.returnDate ? formatDate(row.returnDate) : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="状态"
          width="120"
        >
          <template #default="{ row }">
            <el-tag :type="row.status === 'RETURNED' ? 'success' : 'warning'">
              {{ row.status === 'RETURNED' ? '已归还' : '进行中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'BORROWED'"
              link
              type="primary"
              @click="handleReturn(row)"
            >
              归还图书
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="reviewDialogVisible"
      title="图书评价"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-alert
        type="success"
        :closable="false"
        style="margin-bottom: 16px"
      >
        图书归还成功！欢迎您对借阅的图书进行评价。
      </el-alert>
      <el-descriptions
        :column="1"
        border
        size="small"
        style="margin-bottom: 20px"
      >
        <el-descriptions-item label="图书名称">
          {{ reviewForm.bookTitle }}
        </el-descriptions-item>
        <el-descriptions-item label="借阅人">
          {{ reviewForm.borrowerName }}
        </el-descriptions-item>
      </el-descriptions>
      <el-form
        ref="reviewFormRef"
        :model="reviewForm"
        :rules="reviewRules"
        label-width="80px"
      >
        <el-form-item
          label="评分"
          prop="rating"
        >
          <el-rate v-model="reviewForm.rating" />
        </el-form-item>
        <el-form-item
          label="评价内容"
          prop="comment"
        >
          <el-input
            v-model="reviewForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请分享您对这本书的阅读感受（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleSkipReview">
          稍后评价
        </el-button>
        <el-button
          type="primary"
          :loading="reviewSubmitting"
          @click="submitReview"
        >
          提交评价
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import api from '../api';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import type { FormInstance } from 'element-plus';

const borrows = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');

const reviewDialogVisible = ref(false);
const reviewSubmitting = ref(false);
const reviewFormRef = ref<FormInstance | null>(null);
const reviewForm = reactive({
  borrowRecordId: undefined as number | undefined,
  bookTitle: '',
  borrowerName: '',
  rating: 5,
  comment: '',
});
const reviewRules = {
  rating: [{ required: true, message: '请选择评分', trigger: 'change' }],
};

const filteredBorrows = computed(() => {
  if (!searchQuery.value) return borrows.value;
  const query = searchQuery.value.toLowerCase();
  return borrows.value.filter(item => 
    item.book?.title?.toLowerCase().includes(query) ||
    item.borrower?.name?.toLowerCase().includes(query)
  );
});

const fetchBorrows = async () => {
  loading.value = true;
  try {
    const res: any = await api.get('/borrows');
    borrows.value = res;
  } finally {
    loading.value = false;
  }
};

const handleReturn = async (row: any) => {
  try {
    await api.post(`/borrows/${row.id}/return`);
    ElMessage.success('归还成功');
    fetchBorrows();

    Object.assign(reviewForm, {
      borrowRecordId: row.id,
      bookTitle: row.book?.title || '',
      borrowerName: row.borrower?.name || '',
      rating: 5,
      comment: '',
    });
    reviewDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('归还失败');
  }
};

const submitReview = async () => {
  if (!reviewFormRef.value) return;
  await reviewFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      reviewSubmitting.value = true;
      try {
        await api.post('/reviews', {
          borrowRecordId: reviewForm.borrowRecordId,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        });
        ElMessage.success('评价提交成功');
        reviewDialogVisible.value = false;
      } finally {
        reviewSubmitting.value = false;
      }
    }
  });
};

const handleSkipReview = () => {
  reviewDialogVisible.value = false;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};

onMounted(fetchBorrows);
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  h3 { margin: 0; }
}
</style>
