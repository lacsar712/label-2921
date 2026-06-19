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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '../api';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';

const borrows = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');

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
  } catch (error) {
    ElMessage.error('归还失败');
  }
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
