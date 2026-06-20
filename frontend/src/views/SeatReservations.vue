<template>
  <div class="seat-reservations">
    <div class="page-header">
      <h2>座位预约管理</h2>
      <div class="header-actions">
        <el-button type="warning" @click="batchNoShow">
          <el-icon><Warning /></el-icon>
          批量标记爽约
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="filters" @submit.prevent="fetchReservations">
        <el-form-item label="阅览室">
          <el-select v-model="filters.readingRoomId" placeholder="全部" clearable @change="fetchReservations">
            <el-option
              v-for="r in rooms"
              :key="r.id"
              :label="r.name"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="预约用户">
          <el-select v-model="filters.borrowerId" placeholder="全部" clearable filterable @change="fetchReservations">
            <el-option
              v-for="b in borrowers"
              :key="b.id"
              :label="`${b.name} (${b.phone || ''})`"
              :value="b.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable @change="fetchReservations">
            <el-option label="已预约" value="BOOKED" />
            <el-option label="已签到" value="CHECKED_IN" />
            <el-option label="已取消" value="CANCELLED" />
            <el-option label="爽约未到" value="NO_SHOW" />
            <el-option label="已释放" value="RELEASED" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="filters.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            clearable
            @change="fetchReservations"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchReservations">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-table :data="reservations" style="width: 100%" v-loading="loading">
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="阅览室" width="140">
          <template #default="{ row }">
            {{ row.seat?.zone?.readingRoom?.name }}
          </template>
        </el-table-column>
        <el-table-column label="区域" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.seat?.zone?.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="座位" width="120">
          <template #default="{ row }">
            <div class="seat-cell">
              <span class="seat-num">{{ row.seat?.seatNumber }}</span>
              <div class="seat-tags">
                <el-tag v-if="row.seat?.hasPowerOutlet" type="success" size="small" effect="plain">
                  <el-icon><Lightning /></el-icon>
                </el-tag>
                <el-tag v-if="row.seat?.isWindowSide" type="warning" size="small" effect="plain">
                  <el-icon><Sunny /></el-icon>
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="预约用户" width="160">
          <template #default="{ row }">
            <div>
              <div class="user-name">{{ row.borrower?.name }}</div>
              <div class="user-phone" v-if="row.borrower?.phone">
                {{ row.borrower.phone }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column label="时段" width="140">
          <template #default="{ row }">
            {{ getSlotLabel(row.timeSlot) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType[row.status as SeatReservationStatus]" effect="dark">
              {{ statusLabels[row.status as SeatReservationStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'BOOKED'">
              <el-button size="small" type="success" @click="checkIn(row)">
                签到
              </el-button>
              <el-button size="small" @click="cancel(row)">
                取消
              </el-button>
              <el-button size="small" type="warning" @click="markNoShow(row)">
                爽约
              </el-button>
            </template>
            <template v-else-if="row.status === 'CHECKED_IN'">
              <el-button size="small" type="primary" @click="release(row)">
                释放
              </el-button>
            </template>
            <template v-else>
              <span class="no-action">-</span>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="remarkDialogVisible" :title="dialogTitle" width="400px">
      <el-form :model="remarkForm" label-width="80px">
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
        <el-button @click="remarkDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRemark">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search, Warning, Lightning, Sunny } from '@element-plus/icons-vue';
import api from '../api';
import type { SeatReservation, ReadingRoom, Borrower, TimeSlot, SeatReservationStatus } from '../types';

const route = useRoute();

const reservations = ref<SeatReservation[]>([]);
const rooms = ref<ReadingRoom[]>([]);
const borrowers = ref<Borrower[]>([]);
const loading = ref(false);
const timeSlotLabels = ref<Record<string, { label: string; start: string; end: string }>>({});

const filters = ref({
  readingRoomId: undefined as number | undefined,
  borrowerId: undefined as number | undefined,
  status: undefined as string | undefined,
  date: undefined as string | undefined,
});

const statusLabels: Record<SeatReservationStatus, string> = {
  BOOKED: '已预约',
  CHECKED_IN: '已签到',
  CANCELLED: '已取消',
  NO_SHOW: '爽约未到',
  RELEASED: '已释放',
};

const statusTagType: Record<SeatReservationStatus, string> = {
  BOOKED: 'primary',
  CHECKED_IN: 'success',
  CANCELLED: 'info',
  NO_SHOW: 'danger',
  RELEASED: 'warning',
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
};

const getSlotLabel = (slot: TimeSlot) => {
  const info = timeSlotLabels.value[slot];
  if (info) {
    return `${info.label} ${info.start}-${info.end}`;
  }
  return slot;
};

const fetchTimeSlotLabels = async () => {
  timeSlotLabels.value = await api.get('/reading-rooms/time-slots');
};

const fetchRooms = async () => {
  rooms.value = await api.get('/reading-rooms');
};

const fetchBorrowers = async () => {
  borrowers.value = await api.get('/borrowers');
};

const fetchReservations = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.value.readingRoomId) params.readingRoomId = filters.value.readingRoomId;
    if (filters.value.borrowerId) params.borrowerId = filters.value.borrowerId;
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.date) params.date = filters.value.date;
    if (route.query.id) params.id = route.query.id;
    reservations.value = await api.get('/seat-reservations', { params });
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.value = {
    readingRoomId: undefined,
    borrowerId: undefined,
    status: undefined,
    date: undefined,
  };
  fetchReservations();
};

const remarkDialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const remarkForm = reactive({
  reservationId: 0,
  action: '' as 'check-in' | 'cancel' | 'no-show' | 'release',
  remark: '',
});

const checkIn = (row: SeatReservation) => {
  dialogTitle.value = '签到确认';
  remarkForm.reservationId = row.id;
  remarkForm.action = 'check-in';
  remarkForm.remark = '';
  remarkDialogVisible.value = true;
};

const cancel = (row: SeatReservation) => {
  dialogTitle.value = '取消预约';
  remarkForm.reservationId = row.id;
  remarkForm.action = 'cancel';
  remarkForm.remark = '';
  remarkDialogVisible.value = true;
};

const markNoShow = (row: SeatReservation) => {
  dialogTitle.value = '标记爽约';
  remarkForm.reservationId = row.id;
  remarkForm.action = 'no-show';
  remarkForm.remark = '';
  remarkDialogVisible.value = true;
};

const release = (row: SeatReservation) => {
  dialogTitle.value = '释放座位';
  remarkForm.reservationId = row.id;
  remarkForm.action = 'release';
  remarkForm.remark = '';
  remarkDialogVisible.value = true;
};

const submitRemark = async () => {
  submitting.value = true;
  try {
    const { reservationId, action, remark } = remarkForm;
    await api.post(`/seat-reservations/${reservationId}/${action}`, { remark });
    ElMessage.success('操作成功');
    remarkDialogVisible.value = false;
    fetchReservations();
  } catch (e) {} finally {
    submitting.value = false;
  }
};

const batchNoShow = async () => {
  const { ElMessageBox } = await import('element-plus');
  await ElMessageBox.confirm(
    '确定批量标记超过时段开始30分钟仍未签到的预约为爽约吗？',
    '批量标记爽约',
    { type: 'warning' },
  );
  try {
    const result: any = await api.post('/seat-reservations/batch-no-show');
    ElMessage.success(result.message || '批量标记完成');
    fetchReservations();
  } catch (e) {}
};

onMounted(async () => {
  await Promise.all([fetchTimeSlotLabels(), fetchRooms(), fetchBorrowers()]);
  await fetchReservations();
});
</script>

<style scoped lang="scss">
.seat-reservations {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h2 {
      margin: 0;
      font-size: 22px;
      color: #303133;
    }
  }

  .filter-card {
    margin-bottom: 20px;
  }

  .table-card {
    .seat-cell {
      .seat-num {
        font-weight: 600;
        color: #303133;
      }

      .seat-tags {
        display: flex;
        gap: 4px;
        margin-top: 4px;
      }
    }

    .user-name {
      font-weight: 500;
      color: #303133;
    }

    .user-phone {
      font-size: 12px;
      color: #909399;
      margin-top: 2px;
    }

    .no-action {
      color: #c0c4cc;
    }
  }
}
</style>
