<template>
  <div class="reviews-container">
    <el-card shadow="hover" class="summary-card">
      <div class="summary-header">
        <h3>评价汇总（按图书聚合）</h3>
        <div class="stats-row">
          <el-tag type="primary" size="large">
            共 {{ summaryData.length }} 本图书有评价
          </el-tag>
          <el-tag type="warning" size="large" v-if="totalUnreplied > 0">
            {{ totalUnreplied }} 条待回复投诉
          </el-tag>
        </div>
      </div>

      <el-table
        v-loading="summaryLoading"
        :data="summaryData"
        style="width: 100%; margin-top: 16px"
        border
        stripe
      >
        <el-table-column
          label="书名"
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="handleViewBookReviews(row)"
            >
              {{ row.title }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column
          prop="author"
          label="作者"
          width="100"
        />
        <el-table-column
          prop="isbn"
          label="ISBN"
          width="130"
        />
        <el-table-column
          label="平均分"
          width="110"
        >
          <template #default="{ row }">
            <div class="rating-display">
              <el-rate
                :model-value="row.avgRating"
                disabled
                size="small"
              />
              <span class="rating-num">{{ row.avgRating }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="reviewCount"
          label="评价数"
          width="80"
        />
        <el-table-column
          label="评分分布"
          min-width="300"
        >
          <template #default="{ row }">
            <div class="rating-distribution">
              <div
                v-for="star in [5, 4, 3, 2, 1]"
                :key="star"
                class="dist-row"
              >
                <span class="star-label">{{ star }}星</span>
                <el-progress
                  :percentage="getDistPercent(row, star)"
                  :stroke-width="10"
                  :show-text="false"
                  :color="getDistColor(star)"
                />
                <span class="dist-count">
                  {{ row.ratingDistribution[star] || 0 }}
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="投诉"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.complaintCount > 0"
              type="danger"
            >
              {{ row.complaintCount }}
            </el-tag>
            <span v-else class="text-grey">-</span>
          </template>
        </el-table-column>
        <el-table-column
          label="待回复"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.unrepliedCount > 0"
              type="warning"
            >
              {{ row.unrepliedCount }}
            </el-tag>
            <span v-else class="text-grey">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px">
      <div class="list-header">
        <h3>评价列表</h3>
        <div class="filter-bar">
          <el-select
            v-model="filters.rating"
            placeholder="全部星级"
            clearable
            style="width: 120px"
            @change="fetchReviews"
          >
            <el-option
              v-for="s in 5"
              :key="s"
              :label="`${s}星`"
              :value="s"
            />
          </el-select>
          <el-select
            v-model="filters.isComplaint"
            placeholder="全部类型"
            clearable
            style="width: 130px"
            @change="fetchReviews"
          >
            <el-option label="投诉评价" value="true" />
            <el-option label="普通评价" value="false" />
          </el-select>
          <el-select
            v-model="filters.hasOfficialReply"
            placeholder="回复状态"
            clearable
            style="width: 130px"
            @change="fetchReviews"
          >
            <el-option label="已回复" value="true" />
            <el-option label="未回复" value="false" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 260px"
            @change="handleDateChange"
          />
          <el-input
            v-model="filters.keyword"
            placeholder="搜索关键词（评价内容、书名、借阅人）"
            style="width: 280px"
            clearable
            @clear="fetchReviews"
            @keyup.enter="fetchReviews"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button
            type="primary"
            :icon="Search"
            @click="fetchReviews"
          >
            检索
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="listLoading"
        :data="reviewsData"
        style="width: 100%; margin-top: 16px"
        border
        stripe
      >
        <el-table-column
          label="图书"
          min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div>
              <div class="book-title">{{ row.book?.title }}</div>
              <div class="book-author text-grey">{{ row.book?.author }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="借阅人"
          width="100"
        >
          <template #default="{ row }">
            {{ row.borrower?.name }}
          </template>
        </el-table-column>
        <el-table-column
          label="评分"
          width="120"
        >
          <template #default="{ row }">
            <el-rate
              :model-value="row.rating"
              disabled
              size="small"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="评价内容"
          min-width="220"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div v-if="row.comment" class="comment-text">
              {{ row.comment }}
            </div>
            <span v-else class="text-grey">（无文字评价）</span>
          </template>
        </el-table-column>
        <el-table-column
          label="类型"
          width="80"
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.isComplaint"
              type="danger"
              size="small"
            >
              投诉
            </el-tag>
            <el-tag
              v-else
              type="success"
              size="small"
            >
              普通
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="官方回复"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div v-if="row.officialReply">
              <div class="reply-text">{{ row.officialReply }}</div>
              <div class="reply-meta text-grey">
                — {{ row.officialReplyBy?.username }} · {{ formatDateTime(row.officialReplyAt!) }}
              </div>
            </div>
            <span v-else class="text-grey">-</span>
          </template>
        </el-table-column>
        <el-table-column
          label="评价时间"
          width="160"
        >
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="160"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="warning"
              size="small"
              @click="handleEditReview(row)"
            >
              修改
            </el-button>
            <el-button
              v-if="row.isComplaint && !row.officialReply"
              link
              type="primary"
              size="small"
              @click="handleReply(row)"
            >
              回复
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchReviews"
          @current-change="fetchReviews"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="replyDialogVisible"
      title="官方回复"
      width="500px"
    >
      <div class="reply-review-info">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="图书">
            {{ currentReview?.book?.title }}
          </el-descriptions-item>
          <el-descriptions-item label="借阅人">
            {{ currentReview?.borrower?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="评分">
            <el-rate
              :model-value="currentReview?.rating"
              disabled
              size="small"
            />
          </el-descriptions-item>
          <el-descriptions-item label="评价内容">
            {{ currentReview?.comment || '（无）' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <el-form
        ref="replyFormRef"
        :model="replyForm"
        :rules="replyRules"
        label-width="80px"
        style="margin-top: 20px"
      >
        <el-form-item
          label="回复内容"
          prop="reply"
        >
          <el-input
            v-model="replyForm.reply"
            type="textarea"
            :rows="4"
            placeholder="请输入官方回复内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="replySubmitting"
          @click="submitReply"
        >
          提交回复
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="修改评价"
      width="500px"
    >
      <el-alert
        v-if="!canEdit"
        type="error"
        :closable="false"
        style="margin-bottom: 16px"
      >
        该评价已超过可修改期限（{{ editConfig.editDays }}天），不可修改。
      </el-alert>
      <el-alert
        v-else
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      >
        评价创建后 {{ editConfig.editDays }} 天内可修改。
      </el-alert>
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="80px"
      >
        <el-form-item
          label="评分"
          prop="rating"
        >
          <el-rate v-model="editForm.rating" />
        </el-form-item>
        <el-form-item
          label="评价"
          prop="comment"
        >
          <el-input
            v-model="editForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入评价内容（可选）"
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
          :disabled="!canEdit"
          @click="submitEdit"
        >
          保存修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { Search } from '@element-plus/icons-vue';
import api from '../api';
import { ElMessage, type FormInstance } from 'element-plus';
import type { BookReview, BookReviewSummaryItem } from '../types';

const summaryLoading = ref(false);
const listLoading = ref(false);
const summaryData = ref<BookReviewSummaryItem[]>([]);
const reviewsData = ref<BookReview[]>([]);

const filters = reactive({
  rating: undefined as number | undefined,
  isComplaint: undefined as string | undefined,
  hasOfficialReply: undefined as string | undefined,
  keyword: '',
  startDate: undefined as string | undefined,
  endDate: undefined as string | undefined,
  bookId: undefined as number | undefined,
});

const dateRange = ref<[Date, Date] | null>(null);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const replyDialogVisible = ref(false);
const replySubmitting = ref(false);
const replyFormRef = ref<FormInstance | null>(null);
const currentReview = ref<BookReview | null>(null);
const replyForm = reactive({
  reply: '',
});
const replyRules = {
  reply: [{ required: true, message: '请输入回复内容', trigger: 'blur' }],
};

const editDialogVisible = ref(false);
const editSubmitting = ref(false);
const editFormRef = ref<FormInstance | null>(null);
const editForm = reactive({
  rating: 5,
  comment: '',
});
const editRules = {
  rating: [{ required: true, message: '请选择评分', trigger: 'change' }],
};
const editConfig = ref({ editDays: 30 });
const canEdit = computed(() => {
  if (!currentReview.value) return false;
  const createdAt = new Date(currentReview.value.createdAt);
  const deadline = new Date(createdAt);
  deadline.setDate(deadline.getDate() + editConfig.value.editDays);
  return new Date() <= deadline;
});

const totalUnreplied = computed(() => {
  return summaryData.value.reduce((sum, item) => sum + item.unrepliedCount, 0);
});

const handleDateChange = (val: [Date, Date] | null) => {
  if (val && val.length === 2) {
    filters.startDate = val[0].toISOString().split('T')[0];
    filters.endDate = val[1].toISOString().split('T')[0];
  } else {
    filters.startDate = undefined;
    filters.endDate = undefined;
  }
  fetchReviews();
};

const getDistPercent = (row: BookReviewSummaryItem, star: number) => {
  if (row.reviewCount === 0) return 0;
  return Math.round(((row.ratingDistribution[star] || 0) / row.reviewCount) * 100);
};

const getDistColor = (star: number) => {
  if (star >= 4) return '#67c23a';
  if (star === 3) return '#e6a23c';
  return '#f56c6c';
};

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

const fetchSummary = async () => {
  summaryLoading.value = true;
  try {
    const res = await api.get('/reviews/summary');
    summaryData.value = res as any;
  } catch (error) {
    console.error('Failed to fetch summary:', error);
  } finally {
    summaryLoading.value = false;
  }
};

const fetchReviews = async () => {
  listLoading.value = true;
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
    if (filters.rating) params.rating = filters.rating;
    if (filters.isComplaint !== undefined && filters.isComplaint !== '') {
      params.isComplaint = filters.isComplaint;
    }
    if (filters.hasOfficialReply !== undefined && filters.hasOfficialReply !== '') {
      params.hasOfficialReply = filters.hasOfficialReply;
    }
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.bookId) params.bookId = filters.bookId;

    const res = await api.get('/reviews', { params });
    const data = res as any;
    reviewsData.value = data.data;
    pagination.total = data.total;
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
  } finally {
    listLoading.value = false;
  }
};

const fetchEditConfig = async () => {
  try {
    const res = await api.get('/reviews/edit-config');
    editConfig.value = res as any;
  } catch (error) {
    console.error('Failed to fetch edit config:', error);
  }
};

const handleViewBookReviews = (row: BookReviewSummaryItem) => {
  filters.bookId = row.bookId;
  pagination.page = 1;
  fetchReviews();
  ElMessage.info(`已筛选《${row.title}》的评价，可在上方清除筛选条件查看全部`);
};

const handleReply = (row: BookReview) => {
  currentReview.value = row;
  replyForm.reply = '';
  replyDialogVisible.value = true;
};

const submitReply = async () => {
  if (!replyFormRef.value || !currentReview.value) return;
  await replyFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      replySubmitting.value = true;
      try {
        await api.post(`/reviews/${currentReview.value!.id}/reply`, replyForm);
        ElMessage.success('回复成功');
        replyDialogVisible.value = false;
        fetchSummary();
        fetchReviews();
      } finally {
        replySubmitting.value = false;
      }
    }
  });
};

const handleEditReview = (row: BookReview) => {
  currentReview.value = row;
  editForm.rating = row.rating;
  editForm.comment = row.comment || '';
  editDialogVisible.value = true;
};

const submitEdit = async () => {
  if (!editFormRef.value || !currentReview.value) return;
  await editFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      editSubmitting.value = true;
      try {
        await api.put(`/reviews/${currentReview.value!.id}`, editForm);
        ElMessage.success('修改成功');
        editDialogVisible.value = false;
        fetchSummary();
        fetchReviews();
      } finally {
        editSubmitting.value = false;
      }
    }
  });
};

onMounted(() => {
  fetchSummary();
  fetchReviews();
  fetchEditConfig();
});
</script>

<style scoped lang="scss">
.reviews-container {
  width: 100%;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  h3 {
    margin: 0;
  }

  .stats-row {
    display: flex;
    gap: 12px;
  }
}

.list-header {
  display: flex;
  flex-direction: column;
  gap: 12px;

  h3 {
    margin: 0;
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 6px;

  .rating-num {
    font-weight: 600;
    color: #e6a23c;
  }
}

.rating-distribution {
  .dist-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .star-label {
    width: 36px;
    font-size: 12px;
    color: #606266;
    flex-shrink: 0;
  }

  .dist-count {
    width: 32px;
    text-align: right;
    font-size: 12px;
    color: #909399;
    flex-shrink: 0;
  }

  :deep(.el-progress) {
    flex: 1;
  }
}

.book-title {
  font-weight: 500;
  color: #303133;
}

.book-author {
  font-size: 12px;
  margin-top: 2px;
}

.comment-text {
  color: #303133;
  line-height: 1.5;
}

.reply-text {
  background-color: #f0f9eb;
  padding: 8px 12px;
  border-radius: 4px;
  line-height: 1.5;
  color: #303133;
  border-left: 3px solid #67c23a;
}

.reply-meta {
  font-size: 12px;
  margin-top: 4px;
  text-align: right;
}

.text-grey {
  color: #909399;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.reply-review-info {
  :deep(.el-descriptions__label) {
    width: 90px;
  }
}
</style>
