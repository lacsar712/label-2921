<template>
  <div class="current-borrows-container">
    <el-card shadow="hover">
      <template #header>
        <div class="header-actions">
          <h3>当前借阅信息</h3>
          <div class="search-box">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索书名、作者、借阅人"
              :prefix-icon="Search"
              clearable
              style="width: 250px; margin-right: 12px"
              @input="handleSearch"
            />
            <el-select
              v-model="selectedCategory"
              placeholder="按分类筛选"
              clearable
              style="width: 180px"
              @change="handleFilter"
            >
              <el-option
                label="全部分类"
                value=""
              />
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.name"
              />
            </el-select>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="filteredBorrows"
        style="width: 100%"
        border
        stripe
        :default-sort="{ prop: 'borrowDate', order: 'descending' }"
        :row-class-name="getRowClassName"
      >
        <el-table-column
          prop="book.title"
          label="书名"
          min-width="150"
        >
          <template #default="{ row }">
            <div class="book-title-cell">
              <el-text
                type="primary"
                style="font-weight: 500"
              >
                {{ row.book.title }}
              </el-text>
              <el-tag
                v-if="isOverdue(row)"
                type="danger"
                size="small"
                style="margin-left: 8px"
              >
                已逾期
              </el-tag>
            </div>
          </template>
        </el-table-column>
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
          width="120"
        >
          <template #default="{ row }">
            <el-tag size="small">
              {{ row.book.category.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="book.price"
          label="价格"
          width="80"
        >
          <template #default="{ row }">
            ¥{{ row.book.price }}
          </template>
        </el-table-column>
        <el-table-column
          prop="borrower.name"
          label="借阅人"
          width="120"
        >
          <template #default="{ row }">
            <el-avatar
              :size="24"
              style="margin-right: 8px"
            />
            {{ row.borrower.name }}
          </template>
        </el-table-column>
        <el-table-column
          prop="borrowDate"
          label="借阅时间"
          width="170"
          sortable
        >
          <template #default="{ row }">
            {{ formatDate(row.borrowDate) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="dueDate"
          label="到期时间"
          width="170"
          sortable
        >
          <template #default="{ row }">
            <span :class="{ 'text-danger': isOverdue(row) }">
              {{ formatDate(row.dueDate) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="borrowDays"
          label="借阅天数"
          width="100"
          sortable
        >
          <template #default="{ row }">
            <el-tag :type="getDaysTagType(row)">
              {{ getBorrowDays(row.borrowDate) }} 天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="累计罚金"
          width="130"
        >
          <template #default="{ row }">
            <div v-if="row.fine && row.fine.totalAmount > 0">
              <div class="fine-amount">
                ¥{{ row.fine.totalAmount.toFixed(2) }}
              </div>
              <div class="fine-days">
                逾期 {{ row.fine.overdueDays }} 天
              </div>
            </div>
            <span v-else class="no-fine">-</span>
          </template>
        </el-table-column>
        <el-table-column
          label="最近计费"
          width="160"
        >
          <template #default="{ row }">
            <span v-if="row.fine && row.fine.lastCalculated">
              {{ formatDate(row.fine.lastCalculated) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleReturn(row)"
            >
              归还
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div
        v-if="!loading && filteredBorrows.length === 0"
        class="empty-state"
      >
        <el-empty description="暂无借阅记录" />
      </div>
    </el-card>

    <el-dialog
      v-model="detailDialogVisible"
      title="借阅详情"
      width="700px"
    >
      <el-descriptions
        v-if="selectedBorrow"
        :column="2"
        border
      >
        <el-descriptions-item label="书名">
          {{ selectedBorrow.book.title }}
        </el-descriptions-item>
        <el-descriptions-item label="作者">
          {{ selectedBorrow.book.author }}
        </el-descriptions-item>
        <el-descriptions-item label="ISBN">
          {{ selectedBorrow.book.isbn }}
        </el-descriptions-item>
        <el-descriptions-item label="分类">
          {{ selectedBorrow.book.category.name }}
        </el-descriptions-item>
        <el-descriptions-item label="价格">
          ¥{{ selectedBorrow.book.price }}
        </el-descriptions-item>
        <el-descriptions-item label="库存">
          {{ selectedBorrow.book.stock }}
        </el-descriptions-item>
        <el-descriptions-item
          label="借阅人"
          :span="2"
        >
          {{ selectedBorrow.borrower.name }}
        </el-descriptions-item>
        <el-descriptions-item label="借阅时间">
          {{ formatDate(selectedBorrow.borrowDate) }}
        </el-descriptions-item>
        <el-descriptions-item
          :label="isOverdue(selectedBorrow) ? '到期时间（已逾期）' : '到期时间'"
        >
          <span :class="{ 'text-danger': isOverdue(selectedBorrow) }">
            {{ formatDate(selectedBorrow.dueDate) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="借阅天数" :span="2">
          {{ getBorrowDays(selectedBorrow.borrowDate) }} 天
        </el-descriptions-item>
        <el-descriptions-item
          v-if="selectedBorrow.fine && selectedBorrow.fine.totalAmount > 0"
          label="累计罚金"
        >
          <span class="text-danger">
            ¥{{ selectedBorrow.fine.totalAmount.toFixed(2) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item
          v-if="selectedBorrow.fine && selectedBorrow.fine.totalAmount > 0"
          label="逾期天数"
        >
          <el-tag type="danger">{{ selectedBorrow.fine.overdueDays }} 天</el-tag>
        </el-descriptions-item>
        <el-descriptions-item
          v-if="selectedBorrow.fine && selectedBorrow.fine.lastCalculated"
          label="最近计费时间"
          :span="2"
        >
          {{ formatDate(selectedBorrow.fine.lastCalculated) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="selectedBorrow.book.description"
          label="图书简介"
          :span="2"
        >
          {{ selectedBorrow.book.description }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import api from '../api';
import type { BorrowRecord } from '../types';

const borrows = ref<BorrowRecord[]>([]);
const categories = ref<any[]>([]);
const loading = ref(false);
const searchKeyword = ref('');
const selectedCategory = ref('');
const detailDialogVisible = ref(false);
const selectedBorrow = ref<BorrowRecord | null>(null);

const filteredBorrows = computed(() => {
  let result = borrows.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter((item) =>
      item.book.title.toLowerCase().includes(keyword) ||
      item.book.author.toLowerCase().includes(keyword) ||
      item.borrower.name.toLowerCase().includes(keyword),
    );
  }

  if (selectedCategory.value) {
    result = result.filter((item) => item.book.category.name === selectedCategory.value);
  }

  return result;
});

const fetchCurrentBorrows = async () => {
  loading.value = true;
  try {
    const res: any = await api.get('/borrows/current');
    borrows.value = res;
  } finally {
    loading.value = false;
  }
};

const fetchCategories = async () => {
  try {
    const res: any = await api.get('/categories');
    categories.value = res;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }
};

const isOverdue = (row: BorrowRecord) => {
  return new Date(row.dueDate) < new Date();
};

const getRowClassName = ({ row }: { row: BorrowRecord }) => {
  if (isOverdue(row) && row.fine && row.fine.totalAmount > 0) {
    return 'overdue-row';
  }
  return '';
};

const handleReturn = async (row: BorrowRecord) => {
  try {
    let msg = `确定要归还《${row.book.title}》吗？`;
    if (isOverdue(row) && row.fine && row.fine.totalAmount > 0) {
      msg += `\n\n该借阅已逾期 ${row.fine.overdueDays} 天，产生罚金 ¥${row.fine.totalAmount.toFixed(2)}。`;
    }
    await ElMessageBox.confirm(msg, '确认归还', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await api.post(`/borrows/${row.id}/return`);
    ElMessage.success('归还成功');
    fetchCurrentBorrows();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('归还失败');
    }
  }
};

const handleSearch = () => {};

const handleFilter = () => {};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getBorrowDays = (borrowDate: string) => {
  const borrow = new Date(borrowDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - borrow.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const getDaysTagType = (row: BorrowRecord) => {
  if (isOverdue(row)) return 'danger';
  const days = getBorrowDays(row.borrowDate);
  if (days <= 7) return 'success';
  if (days <= 30) return 'warning';
  return 'danger';
};

onMounted(() => {
  fetchCurrentBorrows();
  fetchCategories();
});
</script>

<style scoped lang="scss">
.current-borrows-container {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    h3 { margin: 0; }
  }

  .search-box {
    display: flex;
    align-items: center;
  }

  .book-title-cell {
    display: flex;
    align-items: center;
  }

  .fine-amount {
    font-weight: 600;
    color: #f56c6c;
    font-size: 14px;
  }

  .fine-days {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
  }

  .no-fine {
    color: #c0c4cc;
  }

  .text-danger {
    color: #f56c6c;
    font-weight: 500;
  }

  .empty-state {
    padding: 60px 0;
  }
}

:deep(.el-table .overdue-row) {
  --el-table-tr-bg-color: #fef0f0;
}
</style>
