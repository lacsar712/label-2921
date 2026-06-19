<template>
  <div class="reading-rooms">
    <div class="page-header">
      <h2>阅览室管理</h2>
      <el-button type="primary" @click="openRoomDialog(null)">
        <el-icon><Plus /></el-icon>
        新增阅览室
      </el-button>
    </div>

    <el-row :gutter="20" class="room-cards">
      <el-col :xs="24" :sm="12" :md="8" v-for="room in rooms" :key="room.id">
        <el-card shadow="hover" class="room-card" @click="goToDetail(room.id)">
          <div class="room-card-header">
            <div class="room-title">
              <el-icon :size="24"><OfficeBuilding /></el-icon>
              <span>{{ room.name }}</span>
            </div>
            <el-tag :type="room.isActive ? 'success' : 'info'" size="small">
              {{ room.isActive ? '开放中' : '已关闭' }}
            </el-tag>
          </div>
          <div class="room-info">
            <div v-if="room.description" class="info-item">
              <span class="label">描述：</span>
              <span>{{ room.description }}</span>
            </div>
            <div v-if="room.location" class="info-item">
              <el-icon><Location /></el-icon>
              <span>{{ room.location }}</span>
            </div>
            <div v-if="room.openTime || room.closeTime" class="info-item">
              <el-icon><Clock /></el-icon>
              <span>{{ room.openTime }} - {{ room.closeTime }}</span>
            </div>
            <div class="info-item">
              <el-icon><Chair /></el-icon>
              <span>{{ getTotalSeats(room) }}个座位 · {{ room.zones?.length || 0 }}个区域</span>
            </div>
          </div>
          <div class="room-actions" @click.stop>
            <el-button size="small" @click="openRoomDialog(room)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteRoom(room)">删除</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="roomDialogVisible"
      :title="editingRoom ? '编辑阅览室' : '新增阅览室'"
      width="500px"
    >
      <el-form :model="roomForm" :rules="roomRules" ref="roomFormRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="roomForm.name" placeholder="请输入阅览室名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input type="textarea" v-model="roomForm.description" :rows="2" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="位置">
          <el-input v-model="roomForm.location" placeholder="请输入位置信息" />
        </el-form-item>
        <el-form-item label="开放时间">
          <el-input v-model="roomForm.openTime" placeholder="如：08:00" />
        </el-form-item>
        <el-form-item label="关闭时间">
          <el-input v-model="roomForm.closeTime" placeholder="如：21:30" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="roomForm.isActive" active-text="开放" inactive-text="关闭" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roomDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRoom">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, OfficeBuilding, Location, Clock, Chair } from '@element-plus/icons-vue';
import api from '../api';
import type { ReadingRoom } from '../types';
import type { FormInstance, FormRules } from 'element-plus';

const router = useRouter();
const rooms = ref<ReadingRoom[]>([]);
const roomDialogVisible = ref(false);
const editingRoom = ref<ReadingRoom | null>(null);
const roomFormRef = ref<FormInstance>();

const roomForm = ref({
  name: '',
  description: '',
  location: '',
  openTime: '',
  closeTime: '',
  isActive: true,
});

const roomRules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
};

const fetchRooms = async () => {
  rooms.value = await api.get('/reading-rooms');
};

const getTotalSeats = (room: ReadingRoom) => {
  if (!room.zones) return 0;
  return room.zones.reduce((sum, z) => sum + (z._count?.seats || 0), 0);
};

const goToDetail = (id: number) => {
  router.push(`/reading-rooms/${id}`);
};

const openRoomDialog = (room: ReadingRoom | null) => {
  editingRoom.value = room;
  if (room) {
    roomForm.value = {
      name: room.name,
      description: room.description || '',
      location: room.location || '',
      openTime: room.openTime || '',
      closeTime: room.closeTime || '',
      isActive: room.isActive,
    };
  } else {
    roomForm.value = {
      name: '',
      description: '',
      location: '',
      openTime: '',
      closeTime: '',
      isActive: true,
    };
  }
  roomDialogVisible.value = true;
};

const saveRoom = async () => {
  if (!roomFormRef.value) return;
  await roomFormRef.value.validate();
  try {
    if (editingRoom.value) {
      await api.put(`/reading-rooms/${editingRoom.value.id}`, roomForm.value);
      ElMessage.success('更新成功');
    } else {
      await api.post('/reading-rooms', roomForm.value);
      ElMessage.success('创建成功');
    }
    roomDialogVisible.value = false;
    fetchRooms();
  } catch (e) {}
};

const deleteRoom = async (room: ReadingRoom) => {
  await ElMessageBox.confirm(`确定要删除阅览室"${room.name}"吗？此操作不可恢复。`, '确认删除', {
    type: 'warning',
  });
  try {
    await api.delete(`/reading-rooms/${room.id}`);
    ElMessage.success('删除成功');
    fetchRooms();
  } catch (e) {}
};

onMounted(fetchRooms);
</script>

<style scoped lang="scss">
.reading-rooms {
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

  .room-cards {
    .room-card {
      cursor: pointer;
      transition: transform 0.2s;
      margin-bottom: 20px;

      &:hover {
        transform: translateY(-2px);
      }

      .room-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .room-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: bold;
          color: #303133;
        }
      }

      .room-info {
        .info-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #606266;
          margin-bottom: 6px;

          .label {
            color: #909399;
          }
        }
      }

      .room-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #ebeef5;
      }
    }
  }
}
</style>
