<template>
  <div class="reservations-container">
    <el-card shadow="hover">
      <template #header>
        <div class="header-actions">
          <h3>预约管理</h3>
        </div>
      </template>

      <el-form
        :inline="true"
        :model="filterForm"
        class="filter-form"
      >
        <el-form-item label="图书">
          <el-select
            v-model="filterForm.bookId"
            placeholder="全部图书"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="book in books"
              :key="book.id"
              :label="book.title"
              :value="book.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="借阅人">
          <el-select
            v-model="filterForm.borrowerId"
            placeholder="全部借阅人"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="borrower in borrowers"
              :key="borrower.id"
              :label="borrower.name"
              :value="borrower.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filterForm.status"
            placeholder="全部状态"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchReservations">
            搜索
          </el-button>
          <el-button @click="resetFilter">
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <el-table
        v-loading="loading"
        :data="reservations"
        style="width: 100%; margin-top: 20px"
        border
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="70"
        />
        <el-table-column
          prop="book.title"
          label="图书"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="borrower.name"
          label="借阅人"
          width="100"
        />
        <el-table-column
          prop="queueNumber"
          label="排队号"
          width="80"
        />
        <el-table-column
          label="排队信息"
          width="120"
        >
          <template #default="{ row }">
            <span v-if="row.status === 'PENDING'">
              第{{ row.position }}位，前方{{ row.aheadCount }}人
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="status"
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="有效期至"
          width="180"
        >
          <template #default="{ row }">
            {{ row.expiresAt ? formatDate(row.expiresAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="预约时间"
          width="180"
        >
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="220"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="handleView(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'PENDING_PICKUP'"
              link
              type="success"
              @click="handlePickup(row)"
            >
              领取
            </el-button>
            <el-button
              v-if="row.status === 'PENDING' || row.status === 'PENDING_PICKUP'"
              link
              type="warning"
              @click="handleCancel(row)"
            >
              取消
            </el-button>
            <el-button
              v-if="row.status === 'PENDING_PICKUP'"
              link
              type="danger"
              @click="handleExpire(row)"
            >
              过期
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="detailDialogVisible"
      title="预约详情"
      width="700px"
    >
      <el-descriptions
        v-if="currentReservation"
        :column="2"
        border
      >
        <el-descriptions-item label="预约ID">
          {{ currentReservation.id }}
        </el-descriptions-item>
        <el-descriptions-item label="图书">
          {{ currentReservation.book?.title }}
        </el-descriptions-item>
        <el-descriptions-item label="借阅人">
          {{ currentReservation.borrower?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ currentReservation.borrower?.phone || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="排队号">
          {{ currentReservation.queueNumber }}
        </el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="getStatusType(currentReservation.status)">
            {{ getStatusLabel(currentReservation.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="排队位置" v-if="currentReservation.status === 'PENDING'">
          第{{ currentReservation.position }}位，前方{{ currentReservation.aheadCount }}人
        </el-descriptions-item>
        <el-descriptions-item label="有效期至" v-if="currentReservation.expiresAt">
          {{ formatDate(currentReservation.expiresAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="预约时间">
          {{ formatDate(currentReservation.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="领取时间" v-if="currentReservation.pickedUpAt">
          {{ formatDate(currentReservation.pickedUpAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="取消时间" v-if="currentReservation.cancelledAt">
          {{ formatDate(currentReservation.cancelledAt) }}
        </el-descriptions-item>
      </el-descriptions>

      <h4 style="margin-top: 20px; margin-bottom: 10px">状态流转记录</h4>
      <el-timeline>
        <el-timeline-item
          v-for="log in currentReservation?.statusLogs"
          :key="log.id"
          :timestamp="formatDate(log.createdAt)"
          placement="top"
        >
          <el-card>
            <div style="display: flex; align-items: center; gap: 10px">
              <el-tag :type="getStatusType(log.toStatus)">
                {{ log.fromStatus ? getStatusLabel(log.fromStatus) + ' → ' : '' }}{{ getStatusLabel(log.toStatus) }}
              </el-tag>
              <span style="color: #606266; font-size: 14px">
                操作人：{{ log.operator?.username || '系统' }}
              </span>
            </div>
            <p v-if="log.remark" style="margin-top: 10px; color: #909399">
              备注：{{ log.remark }}
            </p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>

    <el-dialog
      v-model="remarkDialogVisible"
      :title="dialogTitle"
      width="400px"
    >
      <el-form
        :model="remarkForm"
        label-width="80px"
      >
        <el-form-item label="备注">
          <el-input
            v-model="remarkForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="remarkDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitRemark"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import api from '../api';
import { ElMessage } from 'element-plus';
import type { Reservation, ReservationStatus } from '../types';

const loading = ref(false);
const submitting = ref(false);
const reservations = ref<Reservation[]>([]);
const books = ref<any[]>([]);
const borrowers = ref<any[]>([]);

const filterForm = reactive({
  bookId: undefined as number | undefined,
  borrowerId: undefined as number | undefined,
  status: undefined as ReservationStatus | undefined,
  dateRange: [] as string[]
});

const statusOptions = [
  { value: 'PENDING', label: '排队中' },
  { value: 'PENDING_PICKUP', label: '待领取' },
  { value: 'COMPLETED', label: '已领取' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'EXPIRED', label: '已过期' }
];

const getStatusLabel = (status: ReservationStatus) => {
  const map: Record<ReservationStatus, string> = {
    PENDING: '排队中',
    PENDING_PICKUP: '待领取',
    COMPLETED: '已领取',
    CANCELLED: '已取消',
    EXPIRED: '已过期'
  };
  return map[status] || status;
};

const getStatusType = (status: ReservationStatus) => {
  const map: Record<ReservationStatus, string> = {
    PENDING: 'warning',
    PENDING_PICKUP: 'primary',
    COMPLETED: 'success',
    CANCELLED: 'info',
    EXPIRED: 'danger'
  };
  return map[status] || 'info';
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

const fetchReservations = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filterForm.bookId) params.bookId = filterForm.bookId;
    if (filterForm.borrowerId) params.borrowerId = filterForm.borrowerId;
    if (filterForm.status) params.status = filterForm.status;
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      params.startDate = filterForm.dateRange[0];
      params.endDate = filterForm.dateRange[1];
    }
    const res: any = await api.get('/reservations', { params });
    reservations.value = res;
  } finally {
    loading.value = false;
  }
};

const resetFilter = () => {
  filterForm.bookId = undefined;
  filterForm.borrowerId = undefined;
  filterForm.status = undefined;
  filterForm.dateRange = [];
  fetchReservations();
};

const fetchBooks = async () => {
  const res: any = await api.get('/books');
  books.value = res;
};

const fetchBorrowers = async () => {
  const res: any = await api.get('/borrowers');
  borrowers.value = res;
};

const detailDialogVisible = ref(false);
const currentReservation = ref<Reservation | null>(null);

const handleView = async (row: Reservation) => {
  try {
    const res: any = await api.get(`/reservations/${row.id}`);
    currentReservation.value = res;
    detailDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('获取详情失败');
  }
};

const remarkDialogVisible = ref(false);
const dialogTitle = ref('');
const remarkForm = reactive({
  reservationId: 0,
  action: '' as 'pickup' | 'cancel' | 'expire',
  remark: ''
});

const handlePickup = (row: Reservation) => {
  dialogTitle.value = '领取确认';
  remarkForm.reservationId = row.id;
  remarkForm.action = 'pickup';
  remarkForm.remark = '';
  remarkDialogVisible.value = true;
};

const handleCancel = (row: Reservation) => {
  dialogTitle.value = '取消预约';
  remarkForm.reservationId = row.id;
  remarkForm.action = 'cancel';
  remarkForm.remark = '';
  remarkDialogVisible.value = true;
};

const handleExpire = (row: Reservation) => {
  dialogTitle.value = '标记过期未取';
  remarkForm.reservationId = row.id;
  remarkForm.action = 'expire';
  remarkForm.remark = '';
  remarkDialogVisible.value = true;
};

const submitRemark = async () => {
  submitting.value = true;
  try {
    const { reservationId, action, remark } = remarkForm;
    await api.post(`/reservations/${reservationId}/${action}`, { remark });
    ElMessage.success('操作成功');
    remarkDialogVisible.value = false;
    fetchReservations();
  } catch (error) {
    ElMessage.error('操作失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchReservations();
  fetchBooks();
  fetchBorrowers();
});
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  h3 { margin: 0; }
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}
</style>
