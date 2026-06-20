<template>
  <div class="fines-container">
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card
          shadow="hover"
          class="stat-card pending"
        >
          <div class="stat-content">
            <div class="stat-label">待缴罚金</div>
            <div class="stat-value">{{ stats?.counts?.pending || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          shadow="hover"
          class="stat-card partial"
        >
          <div class="stat-content">
            <div class="stat-label">部分缴纳</div>
            <div class="stat-value">{{ stats?.counts?.partial || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          shadow="hover"
          class="stat-card paid"
        >
          <div class="stat-content">
            <div class="stat-label">已缴清</div>
            <div class="stat-value">{{ stats?.counts?.paid || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          shadow="hover"
          class="stat-card waived"
        >
          <div class="stat-content">
            <div class="stat-label">已减免</div>
            <div class="stat-value">{{ stats?.counts?.waived || 0 }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card
      shadow="hover"
      style="margin-top: 16px"
    >
      <template #header>
        <div class="header-actions">
          <h3>罚金管理</h3>
          <div class="toolbar">
            <el-input
              v-model="keyword"
              placeholder="搜索借阅人、书名、ISBN"
              :prefix-icon="Search"
              clearable
              style="width: 240px; margin-right: 12px"
              @input="handleSearch"
            />
            <el-select
              v-model="statusFilter"
              placeholder="按状态筛选"
              clearable
              style="width: 150px; margin-right: 12px"
              @change="fetchFines"
            >
              <el-option
                label="待缴"
                value="PENDING"
              />
              <el-option
                label="部分缴纳"
                value="PARTIAL"
              />
              <el-option
                label="已缴清"
                value="PAID"
              />
              <el-option
                label="已减免"
                value="WAIVED"
              />
            </el-select>
            <el-button
              type="primary"
              @click="fetchStats"
            >
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="fines"
        style="width: 100%"
        border
        stripe
        :default-sort="{ prop: 'updatedAt', order: 'descending' }"
      >
        <el-table-column
          prop="borrower.name"
          label="借阅人"
          width="120"
        />
        <el-table-column
          prop="borrowRecord.book.title"
          label="书名"
          min-width="160"
        />
        <el-table-column
          prop="borrowRecord.book.isbn"
          label="ISBN"
          width="140"
        />
        <el-table-column
          label="借阅信息"
          width="260"
        >
          <template #default="{ row }">
            <div class="borrow-info">
              <div>借阅：{{ formatDate(row.borrowRecord.borrowDate) }}</div>
              <div>到期：{{ formatDate(row.borrowRecord.dueDate) }}</div>
              <div v-if="row.borrowRecord.returnDate">
                归还：{{ formatDate(row.borrowRecord.returnDate) }}
              </div>
              <div class="overdue-info">
                逾期 <el-tag type="danger" size="small">{{ row.overdueDays }} 天</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="罚金明细" width="200">
          <template #default="{ row }">
            <div class="fine-detail">
              <div>应缴：<span class="amount danger">¥{{ row.totalAmount.toFixed(2) }}</span></div>
              <div>已缴：<span class="amount success">¥{{ row.paidAmount.toFixed(2) }}</span></div>
              <div>已减：<span class="amount warning">¥{{ row.waivedAmount.toFixed(2) }}</span></div>
              <div>待缴：<span class="amount primary">¥{{ (row.totalAmount - row.paidAmount - row.waivedAmount).toFixed(2) }}</span></div>
            </div>
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
          prop="lastCalculated"
          label="最近计费"
          width="160"
        >
          <template #default="{ row }">
            {{ row.lastCalculated ? formatDate(row.lastCalculated) : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="260"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="row.status === 'PAID' || row.status === 'WAIVED'"
              @click="openPayDialog(row)"
            >
              登记收款
            </el-button>
            <el-button
              link
              type="warning"
              :disabled="row.status === 'PAID' || row.status === 'WAIVED'"
              @click="openWaiveDialog(row)"
            >
              减免审批
            </el-button>
            <el-button
              link
              type="info"
              @click="openDetailDialog(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div
        v-if="!loading && fines.length === 0"
        class="empty-state"
      >
        <el-empty description="暂无罚金记录" />
      </div>
    </el-card>

    <el-dialog
      v-model="payDialogVisible"
      title="登记收款"
      width="500px"
      @close="resetPayForm"
    >
      <el-form
        ref="payFormRef"
        :model="payForm"
        :rules="payRules"
        label-width="100px"
      >
        <el-form-item label="借阅人">
          <span>{{ currentFine?.borrower.name }}</span>
        </el-form-item>
        <el-form-item label="待缴金额">
          <span class="amount danger">¥{{ remainingAmount.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item
          label="实收金额"
          prop="amount"
        >
          <el-input-number
            v-model="payForm.amount"
            :min="0.01"
            :max="remainingAmount"
            :precision="2"
            :step="0.5"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="收据编号">
          <el-input
            v-model="payForm.receiptNo"
            placeholder="请输入收据编号（可选）"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="payForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="paySubmitting"
          @click="handlePay"
        >
          确认收款
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="waiveDialogVisible"
      title="罚金减免审批"
      width="500px"
      @close="resetWaiveForm"
    >
      <el-form
        ref="waiveFormRef"
        :model="waiveForm"
        :rules="waiveRules"
        label-width="100px"
      >
        <el-form-item label="借阅人">
          <span>{{ currentFine?.borrower.name }}</span>
        </el-form-item>
        <el-form-item label="待缴金额">
          <span class="amount danger">¥{{ remainingAmount.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="减免金额">
          <el-input-number
            v-model="waiveForm.amount"
            :min="0.01"
            :max="remainingAmount"
            :precision="2"
            :step="0.5"
            style="width: 100%"
          />
          <div class="form-tip">不填则默认减免全部待缴金额</div>
        </el-form-item>
        <el-form-item
          label="审批说明"
          prop="remark"
        >
          <el-input
            v-model="waiveForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请填写减免审批说明（必填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="waiveDialogVisible = false">取消</el-button>
        <el-button
          type="warning"
          :loading="waiveSubmitting"
          @click="handleWaive"
        >
          确认减免
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      title="罚金详情"
      width="700px"
    >
      <template v-if="currentFine">
        <el-descriptions
          :column="2"
          border
        >
          <el-descriptions-item label="借阅人">
            {{ currentFine.borrower.name }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ currentFine.borrower.phone || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="书名">
            {{ currentFine.borrowRecord.book.title }}
          </el-descriptions-item>
          <el-descriptions-item label="ISBN">
            {{ currentFine.borrowRecord.book.isbn }}
          </el-descriptions-item>
          <el-descriptions-item label="借阅时间">
            {{ formatDate(currentFine.borrowRecord.borrowDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="到期时间">
            {{ formatDate(currentFine.borrowRecord.dueDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="归还时间">
            {{ currentFine.borrowRecord.returnDate ? formatDate(currentFine.borrowRecord.returnDate) : '未归还' }}
          </el-descriptions-item>
          <el-descriptions-item label="逾期天数">
            <el-tag type="danger">{{ currentFine.overdueDays }} 天</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="日费率">
            ¥{{ currentFine.dailyRate.toFixed(2) }}/天
          </el-descriptions-item>
          <el-descriptions-item label="宽限天数">
            {{ currentFine.graceDays }} 天
          </el-descriptions-item>
          <el-descriptions-item label="应缴罚金">
            <span class="amount danger">¥{{ currentFine.totalAmount.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentFine.status)">
              {{ getStatusText(currentFine.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="已缴金额">
            <span class="amount success">¥{{ currentFine.paidAmount.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="已减金额">
            <span class="amount warning">¥{{ currentFine.waivedAmount.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item
            label="收据编号"
            :span="2"
          >
            {{ currentFine.receiptNo || '-' }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="currentFine.waiveRemark"
            label="减免说明"
            :span="2"
          >
            {{ currentFine.waiveRemark }}
            <span v-if="currentFine.waiveOperator" class="form-tip">
              （操作人：{{ currentFine.waiveOperator.username }}）
            </span>
          </el-descriptions-item>
          <el-descriptions-item
            label="最近计费"
            :span="2"
          >
            {{ currentFine.lastCalculated ? formatDate(currentFine.lastCalculated) : '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <div
          v-if="currentFine.payments && currentFine.payments.length > 0"
          class="payments-section"
        >
          <h4>收款记录</h4>
          <el-table
            :data="currentFine.payments"
            size="small"
            border
          >
            <el-table-column
              prop="amount"
              label="金额"
              width="100"
            >
              <template #default="{ row }">¥{{ row.amount.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column
              prop="receiptNo"
              label="收据编号"
              width="150"
            >
              <template #default="{ row }">{{ row.receiptNo || '-' }}</template>
            </el-table-column>
            <el-table-column
              prop="operator.username"
              label="操作人"
              width="120"
            >
              <template #default="{ row }">{{ row.operator?.username || '-' }}</template>
            </el-table-column>
            <el-table-column
              prop="remark"
              label="备注"
            />
            <el-table-column
              prop="createdAt"
              label="时间"
              width="160"
            >
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import api from '../api';
import type { Fine, FineStats, FineStatus } from '../types';
import type { FormInstance, FormRules } from 'element-plus';

const fines = ref<Fine[]>([]);
const stats = ref<FineStats | null>(null);
const loading = ref(false);
const keyword = ref('');
const statusFilter = ref<FineStatus | ''>('');

const payDialogVisible = ref(false);
const waiveDialogVisible = ref(false);
const detailDialogVisible = ref(false);
const currentFine = ref<Fine | null>(null);
const paySubmitting = ref(false);
const waiveSubmitting = ref(false);
const payFormRef = ref<FormInstance>();
const waiveFormRef = ref<FormInstance>();

const payForm = reactive({
  amount: 0,
  receiptNo: '',
  remark: '',
});

const waiveForm = reactive({
  amount: 0,
  remark: '',
});

const payRules: FormRules = {
  amount: [{ required: true, message: '请输入实收金额', trigger: 'blur' }],
};

const waiveRules: FormRules = {
  remark: [{ required: true, message: '请填写减免审批说明', trigger: 'blur' }],
};

const remainingAmount = computed(() => {
  if (!currentFine.value) return 0;
  return currentFine.value.totalAmount - currentFine.value.paidAmount - currentFine.value.waivedAmount;
});

const fetchStats = async () => {
  try {
    const res: any = await api.get('/fines/stats');
    stats.value = res;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
};

const fetchFines = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (statusFilter.value) params.status = statusFilter.value;
    if (keyword.value.trim()) params.keyword = keyword.value.trim();
    const res: any = await api.get('/fines', { params });
    fines.value = res;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  fetchFines();
};

const openPayDialog = (row: Fine) => {
  currentFine.value = row;
  payForm.amount = Math.min(remainingAmount.value, remainingAmount.value);
  payForm.receiptNo = '';
  payForm.remark = '';
  payDialogVisible.value = true;
};

const resetPayForm = () => {
  payFormRef.value?.resetFields();
};

const handlePay = async () => {
  if (!payFormRef.value || !currentFine.value) return;
  const fine = currentFine.value;
  await payFormRef.value.validate(async (valid) => {
    if (!valid) return;
    paySubmitting.value = true;
    try {
      await api.post(`/fines/${fine.id}/pay`, payForm);
      ElMessage.success('收款登记成功');
      payDialogVisible.value = false;
      fetchFines();
      fetchStats();
    } catch (error) {
      ElMessage.error('收款登记失败');
    } finally {
      paySubmitting.value = false;
    }
  });
};

const openWaiveDialog = (row: Fine) => {
  currentFine.value = row;
  waiveForm.amount = remainingAmount.value;
  waiveForm.remark = '';
  waiveDialogVisible.value = true;
};

const resetWaiveForm = () => {
  waiveFormRef.value?.resetFields();
};

const handleWaive = async () => {
  if (!waiveFormRef.value || !currentFine.value) return;
  const fine = currentFine.value;
  await waiveFormRef.value.validate(async (valid) => {
    if (!valid) return;
    waiveSubmitting.value = true;
    try {
      await api.post(`/fines/${fine.id}/waive`, waiveForm);
      ElMessage.success('减免审批成功');
      waiveDialogVisible.value = false;
      fetchFines();
      fetchStats();
    } catch (error) {
      ElMessage.error('减免审批失败');
    } finally {
      waiveSubmitting.value = false;
    }
  });
};

const openDetailDialog = (row: Fine) => {
  currentFine.value = row;
  detailDialogVisible.value = true;
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

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(() => {
  fetchStats();
  fetchFines();
});
</script>

<style scoped lang="scss">
.fines-container {
  .stat-card {
    .stat-content {
      text-align: center;
    }
    .stat-label {
      font-size: 14px;
      color: #606266;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
    }
    &.pending .stat-value { color: #f56c6c; }
    &.partial .stat-value { color: #e6a23c; }
    &.paid .stat-value { color: #67c23a; }
    &.waived .stat-value { color: #909399; }
  }

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

  .borrow-info {
    font-size: 12px;
    line-height: 1.8;
    color: #606266;
    .overdue-info {
      margin-top: 4px;
    }
  }

  .fine-detail {
    font-size: 12px;
    line-height: 1.8;
    .amount {
      font-weight: 600;
      &.danger { color: #f56c6c; }
      &.success { color: #67c23a; }
      &.warning { color: #e6a23c; }
      &.primary { color: #409eff; }
    }
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }

  .payments-section {
    margin-top: 20px;
    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #303133;
    }
  }

  .empty-state {
    padding: 60px 0;
  }

  .amount {
    font-weight: 600;
    &.danger { color: #f56c6c; }
    &.success { color: #67c23a; }
    &.warning { color: #e6a23c; }
    &.primary { color: #409eff; }
  }
}
</style>
