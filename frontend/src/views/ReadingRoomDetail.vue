<template>
  <div class="reading-room-detail">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" text @click="goBack">返回</el-button>
        <h2>{{ room?.name }}</h2>
      </div>
      <el-date-picker
        v-model="selectedDate"
        type="date"
        value-format="YYYY-MM-DD"
        :clearable="false"
        @change="fetchBoardData"
      />
    </div>

    <el-row :gutter="20" v-if="room">
      <el-col :span="24">
        <el-card shadow="never" class="stats-card">
          <template #header>
            <div class="card-header">
              <span>当日利用概览 - {{ selectedDate }}</span>
            </div>
          </template>
          <el-row :gutter="16">
            <el-col :xs="12" :sm="6">
              <el-statistic title="总座位" :value="stats?.totalSeats || 0" />
            </el-col>
            <el-col :xs="12" :sm="6">
              <el-statistic title="可用座位" :value="stats?.availableSeats || 0">
                <template #suffix>
                  <span style="font-size: 14px">个</span>
                </template>
              </el-statistic>
            </el-col>
            <el-col :xs="12" :sm="6">
              <el-statistic title="封禁座位" :value="stats?.bannedSeats || 0">
                <template #suffix>
                  <span style="font-size: 14px">个</span>
                </template>
              </el-statistic>
            </el-col>
            <el-col :xs="12" :sm="6">
              <el-statistic title="当日预约" :value="stats?.totalReservations || 0" />
            </el-col>
          </el-row>

          <el-divider />

          <div class="status-counts">
            <div class="count-item" v-for="(count, status) in statusDisplay" :key="status">
              <el-tag :type="statusTagType[status as string]">{{ statusLabels[status as string] }}</el-tag>
              <span class="count">{{ count }}</span>
            </div>
          </div>

          <el-divider />

          <div class="utilization-section">
            <h4>各时段利用率</h4>
            <div class="utilization-bars">
              <div
                class="utilization-bar-wrapper" v-for="slot in timeSlotKeys" :key="slot">
                <div class="slot-label">
                  {{ timeSlotLabels?.[slot]?.label }}
                  <div class="slot-time">
                    {{ timeSlotLabels?.[slot]?.start }}-{{ timeSlotLabels?.[slot]?.end }}
                  </div>
                </div>
                <el-tooltip
                  :content="`利用率：${stats?.slotStats?.[slot]?.utilization || 0}% (${stats?.slotStats?.[slot]?.booked || 0}/${stats?.slotStats?.[slot]?.total || 0}`"
                  placement="top"
                >
                  <el-progress
                    :percentage="stats?.slotStats?.[slot]?.utilization || 0"
                    :color="getUtilizationColor(stats?.slotStats?.[slot]?.utilization || 0)"
                    :stroke-width="20"
                  />
                </el-tooltip>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="24">
        <el-card shadow="never" class="board-card">
          <template #header>
            <div class="card-header">
              <span>座位看板</span>
              <div class="legend">
                <span class="legend-item"><span class="color available"></span>可用</span>
                <span class="legend-item"><span class="color booked"></span>已预约</span>
                <span class="legend-item"><span class="color checkedin"></span>已签到</span>
                <span class="legend-item"><span class="color banned"></span>已封禁</span>
              </div>
            </div>
          </template>

          <div class="board-container">
            <div v-for="zoneData in boardData?.zones" :key="zoneData.zone.id" class="zone-section">
              <div class="zone-title">
                <el-tag :type="zoneTypeTag(zoneData.zone.type)" size="large">
                  {{ zoneData.zone.name }}
                </el-tag>
                <span class="zone-desc">{{ zoneTypeLabel(zoneData.zone.type) }}</span>
              </div>
              <div class="seats-grid">
                <div class="grid-header">
                  <div class="seat-header">座位</div>
                  <div
                    v-for="slot in timeSlotKeys"
                    :key="slot"
                    class="slot-header"
                  >
                    {{ timeSlotLabels?.[slot]?.label }}
                    <div class="slot-sub">{{ timeSlotLabels?.[slot]?.start }}</div>
                  </div>
                </div>
                <div
                  v-for="seatRow in zoneData.seats"
                  :key="seatRow.seat.id"
                  class="seat-row"
                  :class="{ banned: seatRow.seat.status === 'BANNED' }"
                >
                  <div class="seat-cell">
                    <div class="seat-number" :class="seatNumberClass(seatRow.seat)">
                      {{ seatRow.seat.seatNumber }}
                      <div class="seat-icons">
                        <el-tooltip v-if="seatRow.seat.hasPowerOutlet" content="有电源">
                          <el-icon :size="12"><Lightning /></el-icon>
                        </el-tooltip>
                        <el-tooltip v-if="seatRow.seat.isWindowSide" content="靠窗">
                          <el-icon :size="12"><Sunny /></el-icon>
                        </el-tooltip>
                      </div>
                    </div>
                    <div v-if="seatRow.seat.status === 'BANNED'" class="ban-reason">
                      {{ seatRow.seat.banReason }}
                    </div>
                  </div>
                  <div
                    v-for="slot in timeSlotKeys"
                    :key="slot"
                    class="slot-cell"
                    :class="getSlotClass(seatRow, slot)"
                    @click="handleSlotClick(seatRow, slot)"
                  >
                    <template v-if="seatRow.seat.status === 'BANNED'">
                      <span class="slot-status banned-text">封禁</span>
                    </template>
                    <template v-else-if="seatRow.slots[slot]">
                      <div class="reservation-info">
                        <div class="reservation-user">
                          {{ seatRow.slots[slot]?.borrower?.name }}
                        </div>
                        <el-tag
                          :type="reservationStatusTagType[seatRow.slots[slot]?.status || '']" size="small" effect="dark">
                          {{ reservationStatusLabels[seatRow.slots[slot]?.status || ''] }}
                        </el-tag>
                      </div>
                    </template>
                    <template v-else>
                      <el-icon class="available-icon"><Plus /></el-icon>
                    </template>
                  </div>
                  </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="24">
        <el-card shadow="never" class="zones-card">
          <template #header>
            <div class="card-header">
              <span>区域与座位管理</span>
              <el-button type="primary" size="small" @click="openZoneDialog(null)">
                <el-icon><Plus /></el-icon>
                新增区域
              </el-button>
            </div>
          </template>
          <el-table :data="zones" style="width: 100%">
            <el-table-column prop="name" label="区域名称" width="120" />
            <el-table-column label="类型" width="120">
              <template #default="{ row }">
                <el-tag :type="zoneTypeTag(row.type)">{{ zoneTypeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
            <el-table-column label="座位数" width="100" align="center">
              <template #default="{ row }">
                {{ row._count?.seats || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280">
              <template #default="{ row }">
                <el-button size="small" @click="openSeatDialog(null, row)">添加座位</el-button>
                <el-button size="small" @click="openZoneDialog(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteZone(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="24" v-if="selectedZone">
        <el-card shadow="never" class="seats-card">
          <template #header>
            <div class="card-header">
              <span>{{ selectedZone.name }} - 座位列表</span>
            </div>
          </template>
          <el-table :data="seats" style="width: 100%">
            <el-table-column prop="seatNumber" label="座位编号" width="140" />
            <el-table-column label="电源插座" width="100" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.hasPowerOutlet" color="#67c23a"><CircleCheckFilled /></el-icon>
                <el-icon v-else><CircleCloseFilled /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="靠窗" width="100" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.isWindowSide" color="#67c23a"><CircleCheckFilled /></el-icon>
                <el-icon v-else><CircleCloseFilled /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'AVAILABLE' ? 'success' : 'danger'">
                  {{ row.status === 'AVAILABLE' ? '可用' : '封禁' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="banReason" label="封禁原因" />
            <el-table-column label="操作" width="260">
              <template #default="{ row }">
                <el-button size="small" @click="openSeatDialog(row)">编辑</el-button>
                <el-button
                  v-if="row.status === 'AVAILABLE'"
                  size="small"
                  type="warning"
                  @click="banSeat(row)"
                >
                  封禁
                </el-button>
                <el-button
                  v-else
                  size="small"
                  type="success"
                  @click="unbanSeat(row)"
                >
                  解封
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="zoneDialogVisible" :title="editingZone ? '编辑区域' : '新增区域'" width="500px">
      <el-form :model="zoneForm" :rules="zoneRules" ref="zoneFormRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="zoneForm.name" placeholder="请输入区域名称" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="zoneForm.type" placeholder="请选择类型">
            <el-option label="静音区" value="SILENT" />
            <el-option label="普通区" value="GENERAL" />
            <el-option label="讨论区" value="DISCUSSION" />
            <el-option label="电脑区" value="COMPUTER" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="zoneForm.description" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="zoneDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveZone">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="seatDialogVisible" :title="editingSeat ? '编辑座位' : '新增座位'" width="500px">
      <el-form :model="seatForm" :rules="seatRules" ref="seatFormRef" label-width="100px">
        <el-form-item label="座位编号" prop="seatNumber">
          <el-input v-model="seatForm.seatNumber" placeholder="请输入座位编号" />
        </el-form-item>
        <el-form-item label="电源插座">
          <el-switch v-model="seatForm.hasPowerOutlet" />
        </el-form-item>
        <el-form-item label="靠窗">
          <el-switch v-model="seatForm.isWindowSide" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="seatDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSeat">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="banDialogVisible" title="封禁座位" width="400px">
      <el-form :model="banForm" :rules="banRules" ref="banFormRef" label-width="80px">
        <el-form-item label="原因" prop="banReason">
          <el-input type="textarea" v-model="banForm.banReason" :rows="3" placeholder="请输入封禁原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="banDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBanSeat">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reservationDialogVisible" title="座位预约" width="500px">
      <el-form :model="reservationForm" :rules="reservationRules" ref="reservationFormRef" label-width="100px">
        <el-form-item label="座位">
          <el-input :model-value="reservingSeat?.seatNumber" disabled />
        </el-form-item>
        <el-form-item label="时段">
          <el-input :model-value="getSlotLabel(reservingSlot)" disabled />
        </el-form-item>
        <el-form-item label="预约用户" prop="borrowerId">
          <el-select v-model="reservationForm.borrowerId" placeholder="请选择用户" filterable>
            <el-option
              v-for="b in borrowers"
              :key="b.id"
              :label="`${b.name} (${b.phone || ''})`"
              :value="b.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reservationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmReservation">确定预约</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowLeft, Plus, Lightning, Sunny, CircleCheckFilled, CircleCloseFilled
} from '@element-plus/icons-vue';
import api from '../api';
import type {
  ReadingRoom, ReadingZone, Seat, SeatBoardData, ReadingRoomStats,
  TimeSlot, Borrower, ZoneType
} from '../types';
import type { FormInstance, FormRules } from 'element-plus';

const route = useRoute();
const router = useRouter();

const roomId = computed(() => Number(route.params.id));
const room = ref<ReadingRoom | null>(null);
const zones = ref<ReadingZone[]>([]);
const seats = ref<Seat[]>([]);
const selectedZone = ref<ReadingZone | null>(null);
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const boardData = ref<SeatBoardData | null>(null);
const stats = ref<ReadingRoomStats | null>(null);
const borrowers = ref<Borrower[]>([]);

const timeSlotKeys = computed(() => boardData.value?.timeSlots || []);
const timeSlotLabels = computed(() => boardData.value?.timeSlotLabels);

const statusDisplay = computed(() => ({
  BOOKED: stats.value?.statusCounts?.BOOKED || 0,
  CHECKED_IN: stats.value?.statusCounts?.CHECKED_IN || 0,
  CANCELLED: stats.value?.statusCounts?.CANCELLED || 0,
  NO_SHOW: stats.value?.statusCounts?.NO_SHOW || 0,
  RELEASED: stats.value?.statusCounts?.RELEASED || 0,
}));

const statusLabels: Record<string, string> = {
  BOOKED: '已预约',
  CHECKED_IN: '已签到',
  CANCELLED: '已取消',
  NO_SHOW: '爽约未到',
  RELEASED: '已释放',
};

const statusTagType: Record<string, string> = {
  BOOKED: 'primary',
  CHECKED_IN: 'success',
  CANCELLED: 'info',
  NO_SHOW: 'danger',
  RELEASED: 'warning',
};

const reservationStatusLabels: Record<string, string> = {
  BOOKED: '已预约',
  CHECKED_IN: '已签到',
  CANCELLED: '已取消',
  NO_SHOW: '爽约',
  RELEASED: '已释放',
};

const reservationStatusTagType: Record<string, string> = {
  BOOKED: 'primary',
  CHECKED_IN: 'success',
  CANCELLED: 'info',
  NO_SHOW: 'danger',
  RELEASED: 'warning',
};

const zoneDialogVisible = ref(false);
const editingZone = ref<ReadingZone | null>(null);
const zoneFormRef = ref<FormInstance>();
const zoneForm = ref<{
  name: string;
  type: ZoneType;
  description: string;
  readingRoomId: number;
}>({
  name: '',
  type: 'GENERAL',
  description: '',
  readingRoomId: 0,
});
const zoneRules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
};

const seatDialogVisible = ref(false);
const editingSeat = ref<Seat | null>(null);
const seatZoneId = ref<number>(0);
const seatFormRef = ref<FormInstance>();
const seatForm = ref({
  seatNumber: '',
  zoneId: 0,
  hasPowerOutlet: false,
  isWindowSide: false,
});
const seatRules: FormRules = {
  seatNumber: [{ required: true, message: '请输入座位编号', trigger: 'blur' }],
};

const banDialogVisible = ref(false);
const banningSeat = ref<Seat | null>(null);
const banFormRef = ref<FormInstance>();
const banForm = ref({ banReason: '' });
const banRules: FormRules = {
  banReason: [{ required: true, message: '请输入原因', trigger: 'blur' }],
};

const reservationDialogVisible = ref(false);
const reservingSeat = ref<Seat | null>(null);
const reservingSlot = ref<TimeSlot | null>(null);
const reservationFormRef = ref<FormInstance>();
const reservationForm = ref({
  seatId: 0,
  borrowerId: 0,
  date: '',
  timeSlot: '' as TimeSlot | '',
});
const reservationRules: FormRules = {
  borrowerId: [{ required: true, message: '请选择用户', trigger: 'change' }],
};

const goBack = () => router.push('/reading-rooms');

const fetchRoom = async () => {
  room.value = await api.get(`/reading-rooms/${roomId.value}`);
};

const fetchZones = async () => {
  zones.value = await api.get(`/reading-rooms/${roomId.value}/zones`);
  if (zones.value.length > 0 && !selectedZone.value) {
    const firstZone = zones.value[0];
    if (firstZone) selectZone(firstZone);
  }
};

const selectZone = async (zone: ReadingZone) => {
  selectedZone.value = zone;
  seats.value = await api.get(`/reading-rooms/zones/${zone.id}/seats?date=${selectedDate.value}`);
};

const fetchBoardData = async () => {
  boardData.value = await api.get(`/reading-rooms/${roomId.value}/board?date=${selectedDate.value}`);
  stats.value = await api.get(`/reading-rooms/${roomId.value}/stats?date=${selectedDate.value}`);
};

const fetchBorrowers = async () => {
  borrowers.value = await api.get('/borrowers');
};

const getUtilizationColor = (percent: number) => {
  if (percent >= 80) return '#f56c6c';
  if (percent >= 50) return '#e6a23c';
  return '#67c23a';
};

const zoneTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    SILENT: '静音区',
    GENERAL: '普通区',
    DISCUSSION: '讨论区',
    COMPUTER: '电脑区',
  };
  return map[type] || type;
};

const zoneTypeTag = (type: string) => {
  const map: Record<string, string> = {
    SILENT: 'danger',
    GENERAL: '',
    DISCUSSION: 'warning',
    COMPUTER: 'primary',
  };
  return (map[type] || '') as any;
};

const seatNumberClass = (seat: Seat) => ({
  banned: seat.status === 'BANNED',
  window: seat.isWindowSide,
  power: seat.hasPowerOutlet,
});

const getSlotClass = (seatRow: any, slot: TimeSlot) => {
  if (seatRow.seat.status === 'BANNED') return 'banned';
  const reservation = seatRow.slots[slot];
  if (!reservation) return 'available';
  return `reserved-${reservation.status.toLowerCase()}`;
};

const handleSlotClick = (seatRow: any, slot: TimeSlot) => {
  if (seatRow.seat.status === 'BANNED') return;
  const reservation = seatRow.slots[slot];
  if (reservation) {
    router.push({ path: '/seat-reservations', query: { id: String(reservation.id) } });
  } else {
    openReservationDialog(seatRow.seat, slot);
  }
};

const getSlotLabel = (slot: TimeSlot | null) => {
  if (!slot) return '';
  const label = timeSlotLabels.value?.[slot];
  return label ? `${label.label} (${label.start}-${label.end})` : slot;
};

const openZoneDialog = (zone: ReadingZone | null) => {
  editingZone.value = zone;
  if (zone) {
    zoneForm.value = {
      name: zone.name,
      type: zone.type,
      description: zone.description || '',
      readingRoomId: zone.readingRoomId,
    };
  } else {
    zoneForm.value = {
      name: '',
      type: 'GENERAL',
      description: '',
      readingRoomId: roomId.value,
    };
  }
  zoneDialogVisible.value = true;
};

const saveZone = async () => {
  if (!zoneFormRef.value) return;
  await zoneFormRef.value.validate();
  try {
    if (editingZone.value) {
      await api.put(`/reading-rooms/zones/${editingZone.value.id}`, zoneForm.value);
      ElMessage.success('更新成功');
    } else {
      await api.post('/reading-rooms/zones', zoneForm.value);
      ElMessage.success('创建成功');
    }
    zoneDialogVisible.value = false;
    fetchZones();
    fetchRoom();
  } catch (e) {}
};

const deleteZone = async (zone: ReadingZone) => {
  await ElMessageBox.confirm(`确定要删除区域"${zone.name}"吗？`, '确认删除', { type: 'warning' });
  try {
    await api.delete(`/reading-rooms/zones/${zone.id}`);
    ElMessage.success('删除成功');
    fetchZones();
    fetchRoom();
    if (selectedZone.value?.id === zone.id) {
      selectedZone.value = null;
      seats.value = [];
    }
  } catch (e) {}
};

const openSeatDialog = (seat: Seat | null, zone?: ReadingZone) => {
  editingSeat.value = seat;
  if (seat) {
    seatZoneId.value = seat.zoneId;
    seatForm.value = {
      seatNumber: seat.seatNumber,
      zoneId: seat.zoneId,
      hasPowerOutlet: seat.hasPowerOutlet,
      isWindowSide: seat.isWindowSide,
    };
  } else if (zone) {
    seatZoneId.value = zone.id;
    seatForm.value = {
      seatNumber: '',
      zoneId: zone.id,
      hasPowerOutlet: false,
      isWindowSide: false,
    };
  }
  seatDialogVisible.value = true;
};

const saveSeat = async () => {
  if (!seatFormRef.value) return;
  await seatFormRef.value.validate();
  try {
    if (editingSeat.value) {
      await api.put(`/reading-rooms/seats/${editingSeat.value.id}`, seatForm.value);
      ElMessage.success('更新成功');
    } else {
      await api.post('/reading-rooms/seats', seatForm.value);
      ElMessage.success('创建成功');
    }
    seatDialogVisible.value = false;
    if (selectedZone.value) selectZone(selectedZone.value);
    fetchBoardData();
  } catch (e) {}
};

const banSeat = (seat: Seat) => {
  banningSeat.value = seat;
  banForm.value.banReason = '';
  banDialogVisible.value = true;
};

const confirmBanSeat = async () => {
  if (!banFormRef.value || !banningSeat.value) return;
  await banFormRef.value.validate();
  try {
    await api.post(`/reading-rooms/seats/${banningSeat.value.id}/ban`, banForm.value);
    ElMessage.success('封禁成功');
    banDialogVisible.value = false;
    if (selectedZone.value) selectZone(selectedZone.value);
    fetchBoardData();
  } catch (e) {}
};

const unbanSeat = async (seat: Seat) => {
  await ElMessageBox.confirm(`确定要解封座位"${seat.seatNumber}"吗？`, '确认解封', { type: 'warning' });
  try {
    await api.post(`/reading-rooms/seats/${seat.id}/unban`);
    ElMessage.success('解封成功');
    if (selectedZone.value) selectZone(selectedZone.value);
    fetchBoardData();
  } catch (e) {}
};

const openReservationDialog = (seat: Seat, slot: TimeSlot) => {
  reservingSeat.value = seat;
  reservingSlot.value = slot;
  reservationForm.value = {
    seatId: seat.id,
    borrowerId: 0,
    date: selectedDate.value ?? '',
    timeSlot: slot,
  };
  reservationDialogVisible.value = true;
};

const confirmReservation = async () => {
  if (!reservationFormRef.value) return;
  await reservationFormRef.value.validate();
  try {
    await api.post('/seat-reservations', reservationForm.value);
    ElMessage.success('预约成功');
    reservationDialogVisible.value = false;
    fetchBoardData();
  } catch (e) {}
};

watch(selectedZone, (zone) => {
  if (zone) selectZone(zone);
});

onMounted(async () => {
  await Promise.all([fetchRoom(), fetchZones(), fetchBoardData(), fetchBorrowers()]);
});
</script>

<style scoped lang="scss">
.reading-room-detail {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      h2 {
        margin: 0;
        font-size: 22px;
        color: #303133;
      }
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
  }

  .stats-card {
    margin-bottom: 20px;

    .status-counts {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;

      .count-item {
        display: flex;
        align-items: center;
        gap: 8px;

        .count {
          font-size: 18px;
          font-weight: bold;
          color: #303133;
        }
      }
    }

    .utilization-section {
      h4 {
        margin: 0 0 16px 0;
        font-size: 15px;
        color: #303133;
      }

      .utilization-bars {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .utilization-bar-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;

          .slot-label {
            width: 180px;
            font-size: 13px;
            color: #606266;

            .slot-time {
              font-size: 11px;
              color: #909399;
            }
          }

          :deep(.el-progress) {
            flex: 1;
          }
        }
      }
    }
  }

  .board-card {
    margin-bottom: 20px;

    .legend {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #606266;

      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;

        .color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid #ebeef5;

          &.available { background: #f0f9eb; border-color: #e1f3d8; }
          &.booked { background: #ecf5ff; border-color: #d9ecff; }
          &.checkedin { background: #f0f9eb; }
          &.banned { background: #fef0f0; border-color: #fde2e2; }
        }
      }
    }

    .board-container {
      .zone-section {
        margin-bottom: 24px;

        &:last-child {
          margin-bottom: 0;
        }

        .zone-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;

          .zone-desc {
            font-size: 13px;
            color: #909399;
          }
        }

        .seats-grid {
          border: 1px solid #ebeef5;
          border-radius: 8px;
          overflow: hidden;

          .grid-header {
            display: grid;
            grid-template-columns: 140px repeat(6, 1fr);
            background: #f5f7fa;
            font-weight: bold;
            font-size: 13px;
            color: #606266;

            > div {
              padding: 10px;
              text-align: center;
              border-right: 1px solid #ebeef5;

              &:last-child {
                border-right: none;
              }

              .seat-header {
                text-align: left;
                padding-left: 16px;
              }

              .slot-header {
                .slot-sub {
                  font-size: 11px;
                  font-weight: normal;
                  color: #909399;
                }
              }
            }
          }

          .seat-row {
            display: grid;
            grid-template-columns: 140px repeat(6, 1fr);
            border-top: 1px solid #ebeef5;

            &.banned {
              background: #fafafa;
            }

            > div {
              padding: 10px;
              border-right: 1px solid #ebeef5;

              &:last-child {
                border-right: none;
              }
            }

            .seat-cell {
              .seat-number {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-weight: 600;
                padding: 6px 10px;
                border-radius: 6px;
                background: #f5f7fa;
                color: #303133;
                font-size: 13px;

                &.banned {
                  background: #fef0f0;
                  color: #f56c6c;
                }

                .seat-icons {
                  display: flex;
                  gap: 4px;
                  color: #909399;
                }
              }

              .ban-reason {
                font-size: 11px;
                color: #f56c6c;
                margin-top: 4px;
                padding-left: 4px;
              }
            }

            .slot-cell {
              min-height: 56px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: background 0.2s;
              border-radius: 4px;
              margin: 2px;

              &.available {
                background: #f0f9eb;

                &:hover {
                  background: #e1f3d8;
                }

                .available-icon {
                  color: #67c23a;
                  font-size: 18px;
                }
              }

              &.reserved-booked {
                background: #ecf5ff;

                .reservation-info {
                  text-align: center;
                  font-size: 11px;

                  .reservation-user {
                    color: #409eff;
                    font-weight: 500;
                    margin-bottom: 2px;
                  }
                }
              }

              &.reserved-checked_in {
                background: #f0f9eb;

                .reservation-info {
                  text-align: center;
                  font-size: 11px;

                  .reservation-user {
                    color: #67c23a;
                    font-weight: 500;
                    margin-bottom: 2px;
                  }
                }
              }

              &.reserved-cancelled, &.reserved-no_show, &.reserved-released {
                background: #f4f4f5;

                .reservation-info {
                  text-align: center;
                  font-size: 11px;
                  opacity: 0.7;

                  .reservation-user {
                    color: #909399;
                    margin-bottom: 2px;
                  }
                }
              }

              &.banned {
                background: #fef0f0;
                cursor: not-allowed;

                .banned-text {
                  color: #f56c6c;
                  font-size: 12px;
                }
              }
            }
          }
        }
      }
    }
  }

  .zones-card, .seats-card {
    margin-bottom: 20px;
  }
}
</style>
