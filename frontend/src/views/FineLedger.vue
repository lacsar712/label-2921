<template>
  <div class="fine-ledger-container">
    <el-card shadow="hover">
      <template #header>
        <div class="header-actions">
          <h3>罚金台账</h3>
          <div class="toolbar">
            <el-select
              v-model="filterBorrowerId"
              placeholder="按借阅人筛选"
              filterable
              clearable
              style="width: 180px; margin-right: 12px"
              @change="fetchData"
            >
              <el-option
                v-for="b in borrowers"
                :key="b.id"
                :label="b.name"
                :value="b.id"
              />
            </el-select>
            <el-select
              v-model="filterBookId"
              placeholder="按图书筛选"
              filterable
              clearable
              style="width: 200px; margin-right: 12px"
              @change="fetchData"
            >
              <el-option
                v-for="book in books"
                :key="book.id"
                :label="`${book.title} (${book.isbn})`"
                :value="book.id"
              />
            </el-select>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 260px; margin-right: 12px"
              @change="fetchData"
            />
            <el-button
              type="primary"
              :icon="Download"
              :loading="exporting"
              @click="handleExport"
            >
              导出明细
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="ledgerData"
        style="width: 100%"
        border
        stripe
        :default-sort="{ prop: 'createdAt', order: 'descending' }"
      >
        <el-table-column
          prop="id"
          label="罚金编号"
          width="90"
        />
        <el-table-column
          prop="borrower"
          label="借阅人"
          width="110"
        />
        <el-table-column
          prop="phone"
          label="联系电话"
          width="130"
        />
        <el-table-column
          prop="bookTitle"
          label="书名"
          min-width="160"
        />
        <el-table-column
          prop="bookIsbn"
          label="ISBN"
          width="140"
        />
        <el-table-column
          prop="borrowDate"
          label="借阅日期"
          width="110"
        />
        <el-table-column
          prop="dueDate"
          label="到期日期"
          width="110"
        />
        <el-table-column
          prop="returnDate"
          label="归还日期"
          width="110"
        >
          <template #default="{ row }">
            {{ row.returnDate || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="overdueDays"
          label="逾期天数"
          width="90"
          sortable
        >
          <template #default="{ row }">
            <el-tag
              v-if="row.overdueDays > 0"
              type="danger"
              size="small"
            >
              {{ row.overdueDays }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="totalAmount"
          label="应缴金额"
          width="100"
          sortable
        >
          <template #default="{ row }">
            <span class="amount danger">¥{{ Number(row.totalAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="paidAmount"
          label="已缴金额"
          width="100"
          sortable
        >
          <template #default="{ row }">
            <span class="amount success">¥{{ Number(row.paidAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="waivedAmount"
          label="已减金额"
          width="100"
          sortable
        >
          <template #default="{ row }">
            <span class="amount warning">¥{{ Number(row.waivedAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="remainingAmount"
          label="待缴金额"
          width="100"
          sortable
        >
          <template #default="{ row }">
            <span class="amount primary">¥{{ Number(row.remainingAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="receiptNo"
          label="收据编号"
          width="120"
        >
          <template #default="{ row }">
            {{ row.receiptNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="产生日期"
          width="120"
          sortable
        />
      </el-table>

      <div
        v-if="!loading && ledgerData.length === 0"
        class="empty-state"
      >
        <el-empty description="暂无罚金台账数据" />
      </div>

      <div v-if="ledgerData.length > 0" class="summary-row">
        <el-descriptions :column="4" size="small">
          <el-descriptions-item label="总记录数">
            {{ ledgerData.length }} 条
          </el-descriptions-item>
          <el-descriptions-item label="应缴总额">
            <span class="amount danger">¥{{ totalSummary.totalAmount.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="已缴总额">
            <span class="amount success">¥{{ totalSummary.paidAmount.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="待缴总额">
            <span class="amount primary">¥{{ totalSummary.remainingAmount.toFixed(2) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Download } from '@element-plus/icons-vue';
import api from '../api';
import type { FineStatus } from '../types';

const loading = ref(false);
const exporting = ref(false);
const ledgerData = ref<any[]>([]);
const borrowers = ref<any[]>([]);
const books = ref<any[]>([]);
const filterBorrowerId = ref<number | ''>('');
const filterBookId = ref<number | ''>('');
const dateRange = ref<string[]>([]);

const totalSummary = computed(() => {
  return ledgerData.value.reduce(
    (acc, row) => ({
      totalAmount: acc.totalAmount + Number(row.totalAmount || 0),
      paidAmount: acc.paidAmount + Number(row.paidAmount || 0),
      waivedAmount: acc.waivedAmount + Number(row.waivedAmount || 0),
      remainingAmount: acc.remainingAmount + Number(row.remainingAmount || 0),
    }),
    { totalAmount: 0, paidAmount: 0, waivedAmount: 0, remainingAmount: 0 },
  );
});

const fetchBorrowers = async () => {
  try {
    const res: any = await api.get('/borrowers');
    borrowers.value = res;
  } catch (error) {
    console.error('Failed to fetch borrowers:', error);
  }
};

const fetchBooks = async () => {
  try {
    const res: any = await api.get('/books');
    books.value = res;
  } catch (error) {
    console.error('Failed to fetch books:', error);
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filterBorrowerId.value) params.borrowerId = filterBorrowerId.value;
    if (filterBookId.value) params.bookId = filterBookId.value;
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const res: any = await api.get('/fines/export/data', { params });
    ledgerData.value = res;
  } finally {
    loading.value = false;
  }
};

const handleExport = async () => {
  exporting.value = true;
  try {
    const params: any = {};
    if (filterBorrowerId.value) params.borrowerId = filterBorrowerId.value;
    if (filterBookId.value) params.bookId = filterBookId.value;
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const data: any = await api.get('/fines/export/data', { params });

    if (!data || data.length === 0) {
      ElMessage.warning('没有可导出的数据');
      return;
    }

    const headers = [
      '罚金编号', '借阅人', '联系电话', '邮箱', '书名', 'ISBN',
      '借阅日期', '到期日期', '归还日期', '逾期天数', '日费率',
      '应缴金额', '已缴金额', '已减金额', '待缴金额', '状态',
      '收据编号', '减免说明', '产生日期', '最近计费',
    ];

    const statusMap: Record<FineStatus, string> = {
      PENDING: '待缴',
      PARTIAL: '部分缴纳',
      PAID: '已缴清',
      WAIVED: '已减免',
    };

    const rows = data.map((r: any) => [
      r.id, r.borrower, r.phone, r.email, r.bookTitle, r.bookIsbn,
      r.borrowDate, r.dueDate, r.returnDate, r.overdueDays, r.dailyRate,
      r.totalAmount, r.paidAmount, r.waivedAmount, r.remainingAmount,
      statusMap[r.status as FineStatus] || r.status,
      r.receiptNo, r.waiveRemark, r.createdAt, r.lastCalculated,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell) => `"${cell ?? ''}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date().toISOString().slice(0, 10);
    link.download = `罚金台账_${now}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  } finally {
    exporting.value = false;
  }
};

const getStatusType = (status: FineStatus) => {
  const map: Record<FineStatus, string> = {
    PENDING: 'danger',
    PARTIAL: 'warning',
    PAID: 'success',
    WAIVED: 'info',
  };
  return map[status] || 'info';
};

const getStatusText = (status: FineStatus) => {
  const map: Record<FineStatus, string> = {
    PENDING: '待缴',
    PARTIAL: '部分缴纳',
    PAID: '已缴清',
    WAIVED: '已减免',
  };
  return map[status] || status;
};

onMounted(() => {
  fetchBorrowers();
  fetchBooks();
  fetchData();
});
</script>

<style scoped lang="scss">
.fine-ledger-container {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    h3 { margin: 0; }
  }

  .toolbar {
    display: flex;
    align-items: center;
  }

  .amount {
    font-weight: 600;
    &.danger { color: #f56c6c; }
    &.success { color: #67c23a; }
    &.warning { color: #e6a23c; }
    &.primary { color: #409eff; }
  }

  .empty-state {
    padding: 60px 0;
  }

  .summary-row {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #dcdfe6;
  }
}
</style>
