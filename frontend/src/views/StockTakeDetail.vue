<template>
  <div class="stock-take-detail-container">
    <el-page-header @back="goBack" title="返回列表">
      <template #content>
        <span class="page-title">{{ stockTake?.title || '盘点详情' }}</span>
        <el-tag v-if="stockTake" :type="statusType(stockTake.status)" style="margin-left: 12px">
          {{ statusLabel(stockTake.status) }}
        </el-tag>
      </template>
    </el-page-header>

    <div v-if="stockTake" class="detail-content">
      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :span="16">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>盘点明细</span>
                <div class="header-actions">
                  <el-input
                    v-model="itemSearch"
                    placeholder="搜索书名/ISBN"
                    clearable
                    style="width: 200px; margin-right: 12px"
                    @clear="fetchItems"
                    @keyup.enter="fetchItems"
                  >
                    <template #prefix><el-icon><Search /></el-icon></template>
                  </el-input>
                  <el-select
                    v-model="itemFilter"
                    placeholder="筛选"
                    clearable
                    style="width: 120px; margin-right: 12px"
                    @change="fetchItems"
                  >
                    <el-option label="未盘点" value="uncounted" />
                    <el-option label="有差异" value="diff" />
                    <el-option label="已盘点" value="counted" />
                  </el-select>
                  <el-button
                    v-if="stockTake.status === 'IN_PROGRESS'"
                    type="primary"
                    :disabled="!hasSelectedItems"
                    @click="batchSubmitVisible = true"
                  >
                    批量录入 ({{ selectedItems.length }})
                  </el-button>
                </div>
              </div>
            </template>

            <el-table
              v-loading="itemsLoading"
              :data="items"
              border
              stripe
              @selection-change="handleSelectionChange"
              :row-class-name="getRowClassName"
            >
              <el-table-column
                v-if="stockTake.status === 'IN_PROGRESS'"
                type="selection"
                width="50"
                :selectable="() => true"
              />
              <el-table-column prop="bookTitle" label="书名" min-width="180" show-overflow-tooltip />
              <el-table-column prop="bookIsbn" label="ISBN" width="140" />
              <el-table-column label="单价" width="80" align="center">
                <template #default="{ row }">¥{{ row.bookPrice.toFixed(2) }}</template>
              </el-table-column>
              <el-table-column prop="expectedStock" label="账面库存" width="90" align="center" />
              <el-table-column label="实盘数量" width="120" align="center">
                <template #default="{ row }">
                  <el-input-number
                    v-if="stockTake.status === 'IN_PROGRESS'"
                    v-model="row._editActual"
                    :min="0"
                    size="small"
                    style="width: 100%"
                    @change="handleActualChange(row)"
                  />
                  <span v-else>{{ row.actualStock ?? '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="差异" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.isCounted" :style="{ color: row.diffQty > 0 ? '#e6a23c' : row.diffQty < 0 ? '#f56c6c' : '#67c23a', fontWeight: 'bold' }">
                    {{ row.diffQty > 0 ? '+' : '' }}{{ row.diffQty }}
                  </span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="差异金额" width="100" align="center">
                <template #default="{ row }">
                  <span v-if="row.isCounted" :style="{ color: row.diffAmount > 0 ? '#e6a23c' : row.diffAmount < 0 ? '#f56c6c' : '' }">
                    ¥{{ row.diffAmount.toFixed(2) }}
                  </span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="盘亏原因" width="120">
                <template #default="{ row }">
                  <el-select
                    v-if="stockTake.status === 'IN_PROGRESS' && row.isCounted && row.diffQty < 0"
                    v-model="row._editReason"
                    size="small"
                    style="width: 100%"
                    @change="handleReasonChange(row)"
                  >
                    <el-option label="正常" value="NORMAL" />
                    <el-option label="丢失" value="LOST" />
                    <el-option label="损坏" value="DAMAGED" />
                    <el-option label="错放" value="MISPLACED" />
                    <el-option label="其他" value="OTHER" />
                  </el-select>
                  <span v-else-if="row.diffReason">{{ diffReasonLabel(row.diffReason) }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="位置备注" width="150">
                <template #default="{ row }">
                  <el-input
                    v-if="stockTake.status === 'IN_PROGRESS' && row.isCounted"
                    v-model="row._editLocation"
                    size="small"
                    placeholder="位置备注"
                    @blur="handleLocationChange(row)"
                  />
                  <span v-else>{{ row.locationRemark || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right" v-if="stockTake.status === 'IN_PROGRESS'">
                <template #default="{ row }">
                  <el-button
                    link
                    type="primary"
                    :disabled="row._editActual === undefined || row._editActual === null"
                    @click="saveItem(row)"
                  >
                    保存
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-pagination
              v-model:current-page="itemPagination.page"
              v-model:page-size="itemPagination.pageSize"
              :total="itemPagination.total"
              :page-sizes="[20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              style="margin-top: 16px; justify-content: flex-end"
              background
              @size-change="fetchItems"
              @current-change="fetchItems"
            />
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card shadow="hover" style="margin-bottom: 20px">
            <template #header><span>盘点信息</span></template>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="盘点编号">{{ stockTake.id }}</el-descriptions-item>
              <el-descriptions-item label="盘点标题">{{ stockTake.title }}</el-descriptions-item>
              <el-descriptions-item label="分类">{{ stockTake.category?.name || '全部分类' }}</el-descriptions-item>
              <el-descriptions-item label="创建人">{{ stockTake.createdBy?.username || '-' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDate(stockTake.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="开始时间">{{ stockTake.startedAt ? formatDate(stockTake.startedAt) : '-' }}</el-descriptions-item>
              <el-descriptions-item label="提交时间">{{ stockTake.submittedAt ? formatDate(stockTake.submittedAt) : '-' }}</el-descriptions-item>
              <el-descriptions-item label="复核人">{{ stockTake.reviewedBy?.username || '-' }}</el-descriptions-item>
              <el-descriptions-item label="复核时间">{{ stockTake.reviewedAt ? formatDate(stockTake.reviewedAt) : '-' }}</el-descriptions-item>
              <el-descriptions-item label="完成时间">{{ stockTake.completedAt ? formatDate(stockTake.completedAt) : '-' }}</el-descriptions-item>
              <el-descriptions-item label="备注">{{ stockTake.remark || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <el-card shadow="hover" style="margin-bottom: 20px">
            <template #header><span>盘点统计</span></template>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">{{ stockTake.totalBooks }}</div>
                <div class="stat-label">图书种数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ stockTake.totalExpectedQty }}</div>
                <div class="stat-label">账面库存</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ stockTake.totalActualQty }}</div>
                <div class="stat-label">实盘库存</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" :style="{ color: stockTake.totalDiffQty > 0 ? '#e6a23c' : stockTake.totalDiffQty < 0 ? '#f56c6c' : '' }">
                  {{ stockTake.totalDiffQty > 0 ? '+' : '' }}{{ stockTake.totalDiffQty }}
                </div>
                <div class="stat-label">差异数量</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" :style="{ color: stockTake.totalDiffAmount > 0 ? '#e6a23c' : stockTake.totalDiffAmount < 0 ? '#f56c6c' : '' }">
                  ¥{{ stockTake.totalDiffAmount.toFixed(2) }}
                </div>
                <div class="stat-label">差异金额</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ countProgress }}</div>
                <div class="stat-label">盘点进度</div>
              </div>
            </div>
            <el-progress
              v-if="stockTake.totalBooks > 0"
              :percentage="Math.round((stockTake.totalActualQty !== undefined ? items.filter(i => i.isCounted).length : 0) / stockTake.totalBooks * 100)"
              style="margin-top: 12px"
            />
          </el-card>

          <el-card shadow="hover" style="margin-bottom: 20px" v-if="diffSummary">
            <template #header><span>差异汇总</span></template>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="盘平数量">
                <el-tag type="success">{{ diffSummary.normalCount }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="盘盈数量">
                <el-tag type="warning">{{ diffSummary.gainCount }} ({{ diffSummary.gainTotalQty }}册 / ¥{{ diffSummary.gainTotalAmount.toFixed(2) }})</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="盘亏数量">
                <el-tag type="danger">{{ diffSummary.lossCount }} ({{ diffSummary.lossTotalQty }}册 / ¥{{ diffSummary.lossTotalAmount.toFixed(2) }})</el-tag>
              </el-descriptions-item>
            </el-descriptions>
            <div v-if="diffSummary.reasonStats.some(s => s.count > 0)" style="margin-top: 12px">
              <div style="font-size: 13px; color: #606266; margin-bottom: 8px">盘亏原因分布：</div>
              <div v-for="rs in diffSummary.reasonStats.filter(s => s.count > 0)" :key="rs.reason" class="reason-item">
                <span>{{ diffReasonLabel(rs.reason as DiffReason) }}</span>
                <span>{{ rs.count }}种 / {{ rs.qty }}册 / ¥{{ rs.amount.toFixed(2) }}</span>
              </div>
            </div>
          </el-card>

          <el-card shadow="hover" style="margin-bottom: 20px">
            <template #header><span>操作</span></template>
            <div class="action-buttons">
              <el-button
                v-if="stockTake.status === 'DRAFT'"
                type="primary"
                @click="handleStartStockTake"
              >
                开始盘点
              </el-button>
              <el-button
                v-if="stockTake.status === 'IN_PROGRESS'"
                type="warning"
                @click="handleSubmitReview"
              >
                提交复核
              </el-button>
              <el-button
                v-if="userStore.isAdmin && stockTake.status === 'PENDING_REVIEW'"
                type="success"
                @click="handleApprove"
              >
                复核通过
              </el-button>
              <el-button
                v-if="userStore.isAdmin && stockTake.status === 'PENDING_REVIEW'"
                type="warning"
                @click="handleRejectReview"
              >
                驳回
              </el-button>
            </div>
          </el-card>

          <el-card shadow="hover" v-if="stockTake.statusLogs && stockTake.statusLogs.length > 0">
            <template #header><span>状态流转</span></template>
            <el-timeline>
              <el-timeline-item
                v-for="log in stockTake.statusLogs"
                :key="log.id"
                :timestamp="formatDate(log.createdAt)"
                :type="getTimelineType(log.toStatus)"
              >
                <el-tag :type="statusType(log.toStatus)" size="small">
                  {{ statusLabel(log.toStatus) }}
                </el-tag>
                <span style="margin-left: 8px; font-size: 13px; color: #606266">{{ log.remark || '' }}</span>
                <div v-if="log.operator" style="font-size: 12px; color: #909399; margin-top: 4px">
                  操作人：{{ log.operator.username }}
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div v-else style="text-align: center; padding: 60px">
      <el-empty v-if="!loading" description="加载中..." />
    </div>

    <el-dialog v-model="batchSubmitVisible" title="批量录入盘点结果" width="700px">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        将批量保存选中图书的实盘数量，请确保已输入正确的数量。
      </el-alert>
      <el-table :data="selectedItems" border size="small" max-height="400">
        <el-table-column prop="bookTitle" label="书名" min-width="150" show-overflow-tooltip />
        <el-table-column prop="bookIsbn" label="ISBN" width="130" />
        <el-table-column prop="expectedStock" label="账面" width="70" align="center" />
        <el-table-column label="实盘" width="100" align="center">
          <template #default="{ row }">{{ row._editActual ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="差异" width="70" align="center">
          <template #default="{ row }">
            <span :style="{ color: (row._editActual ?? 0) - row.expectedStock > 0 ? '#e6a23c' : (row._editActual ?? 0) - row.expectedStock < 0 ? '#f56c6c' : '' }">
              {{ (row._editActual ?? 0) - row.expectedStock }}
            </span>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="batchSubmitVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchSaving" @click="handleBatchSave">确认批量录入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import type { StockTake, StockTakeItem, StockTakeStatus, StockTakeDiffSummary, DiffReason } from '../types';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const stockTakeId = Number(route.params.id);
const loading = ref(false);
const itemsLoading = ref(false);
const stockTake = ref<StockTake | null>(null);
const items = ref<any[]>([]);
const diffSummary = ref<StockTakeDiffSummary | null>(null);
const itemSearch = ref('');
const itemFilter = ref('');
const selectedItems = ref<any[]>([]);
const batchSubmitVisible = ref(false);
const batchSaving = ref(false);

const itemPagination = reactive({
  page: 1,
  pageSize: 50,
  total: 0,
});

const countProgress = computed(() => {
  if (!stockTake.value || stockTake.value.totalBooks === 0) return '0%';
  const counted = items.value.filter(i => i.isCounted).length;
  return `${counted}/${stockTake.value.totalBooks}`;
});

const hasSelectedItems = computed(() => selectedItems.value.length > 0);

const statusLabel = (status: StockTakeStatus): string => {
  const labels: Record<StockTakeStatus, string> = {
    DRAFT: '草稿',
    IN_PROGRESS: '盘点中',
    PENDING_REVIEW: '待复核',
    COMPLETED: '已完成',
  };
  return labels[status] || status;
};

const statusType = (status: StockTakeStatus): string => {
  const types: Record<StockTakeStatus, string> = {
    DRAFT: 'info',
    IN_PROGRESS: '',
    PENDING_REVIEW: 'warning',
    COMPLETED: 'success',
  };
  return types[status] || '';
};

const diffReasonLabel = (reason: DiffReason): string => {
  const labels: Record<DiffReason, string> = {
    NORMAL: '正常',
    LOST: '丢失',
    DAMAGED: '损坏',
    MISPLACED: '错放',
    OTHER: '其他',
  };
  return labels[reason] || reason;
};

const getTimelineType = (status: StockTakeStatus): string => {
  const map: Record<StockTakeStatus, string> = {
    DRAFT: 'info',
    IN_PROGRESS: 'primary',
    PENDING_REVIEW: 'warning',
    COMPLETED: 'success',
  };
  return map[status] || 'primary';
};

const getRowClassName = ({ row }: { row: any }): string => {
  if (!row.isCounted) return 'row-uncounted';
  if (row.diffQty !== 0) return 'row-diff';
  return '';
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

const fetchStockTake = async () => {
  loading.value = true;
  try {
    const res: any = await api.get(`/stock-takes/${stockTakeId}`);
    stockTake.value = res;
  } catch (error) {
    ElMessage.error('获取盘点单详情失败');
  } finally {
    loading.value = false;
  }
};

const fetchItems = async () => {
  itemsLoading.value = true;
  try {
    const params: any = {
      page: itemPagination.page,
      pageSize: itemPagination.pageSize,
    };
    if (itemSearch.value) {
      params.search = itemSearch.value;
    }
    if (itemFilter.value === 'uncounted') {
      params.isCounted = 'false';
    } else if (itemFilter.value === 'counted') {
      params.isCounted = 'true';
    }
    const res: any = await api.get(`/stock-takes/${stockTakeId}/items`, { params });
    items.value = res.data.map((item: StockTakeItem) => ({
      ...item,
      _editActual: item.actualStock ?? item.expectedStock,
      _editReason: item.diffReason || 'NORMAL',
      _editLocation: item.locationRemark || '',
    }));
    itemPagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取盘点明细失败');
  } finally {
    itemsLoading.value = false;
  }
};

const fetchDiffSummary = async () => {
  try {
    const res: any = await api.get(`/stock-takes/${stockTakeId}/diff-summary`);
    diffSummary.value = res;
  } catch (error) {
    console.error('Failed to fetch diff summary:', error);
  }
};

const handleSelectionChange = (selection: any[]) => {
  selectedItems.value = selection;
};

const handleActualChange = (row: any) => {
  const diff = row._editActual - row.expectedStock;
  row.diffQty = diff;
  row.diffAmount = parseFloat((diff * row.bookPrice).toFixed(2));
  if (diff === 0) {
    row._editReason = 'NORMAL';
  }
};

const handleReasonChange = (row: any) => {
  row.diffReason = row._editReason;
};

const handleLocationChange = (row: any) => {
  row.locationRemark = row._editLocation;
};

const saveItem = async (row: any) => {
  try {
    const payload: any = {
      actualStock: row._editActual,
      diffReason: row._editReason || undefined,
      locationRemark: row._editLocation || undefined,
    };
    await api.put(`/stock-takes/${stockTakeId}/items/${row.id}`, payload);
    ElMessage.success('保存成功');
    fetchItems();
    fetchStockTake();
    fetchDiffSummary();
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

const handleBatchSave = async () => {
  if (selectedItems.value.length === 0) return;
  batchSaving.value = true;
  try {
    const payload = {
      items: selectedItems.value.map((item) => ({
        bookId: item.bookId,
        actualStock: item._editActual ?? 0,
        diffReason: item._editReason || undefined,
        locationRemark: item._editLocation || undefined,
      })),
    };
    await api.post(`/stock-takes/${stockTakeId}/items/batch`, payload);
    ElMessage.success(`批量录入 ${selectedItems.value.length} 条成功`);
    batchSubmitVisible.value = false;
    fetchItems();
    fetchStockTake();
    fetchDiffSummary();
  } catch (error) {
    ElMessage.error('批量录入失败');
  } finally {
    batchSaving.value = false;
  }
};

const handleStartStockTake = async () => {
  try {
    await ElMessageBox.confirm(
      '开始盘点后，请逐本录入实盘数量。确定开始盘点吗？',
      '确认开始盘点',
      { type: 'warning' }
    );
    await api.post(`/stock-takes/${stockTakeId}/start`);
    ElMessage.success('盘点已开始');
    fetchStockTake();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('开始盘点失败');
    }
  }
};

const handleSubmitReview = async () => {
  try {
    await ElMessageBox.confirm(
      '提交复核前请确保所有图书已盘点完毕。确定提交复核吗？',
      '确认提交复核',
      { type: 'warning' }
    );
    await api.post(`/stock-takes/${stockTakeId}/submit`);
    ElMessage.success('已提交复核');
    fetchStockTake();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('提交复核失败');
    }
  }
};

const handleApprove = async () => {
  try {
    await ElMessageBox.confirm(
      '复核通过后，系统将自动调整库存。确定通过吗？',
      '确认复核通过',
      { type: 'warning' }
    );
    await api.post(`/stock-takes/${stockTakeId}/review`, { remark: '复核通过' });
    ElMessage.success('复核通过，库存已调整');
    fetchStockTake();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('复核失败');
    }
  }
};

const handleRejectReview = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回复核', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入驳回原因',
    });
    await api.post(`/stock-takes/${stockTakeId}/reject`, { remark: value || '驳回复核' });
    ElMessage.success('已驳回');
    fetchStockTake();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('驳回失败');
    }
  }
};

const goBack = () => {
  router.push('/stock-takes');
};

onMounted(() => {
  fetchStockTake();
  fetchItems();
  fetchDiffSummary();
});
</script>

<style scoped lang="scss">
.stock-take-detail-container {
  .page-title {
    font-size: 16px;
    font-weight: 600;
  }

  .detail-content {
    margin-top: 10px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      align-items: center;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;

    .stat-item {
      text-align: center;
      padding: 8px;
      background: #f5f7fa;
      border-radius: 4px;

      .stat-value {
        font-size: 20px;
        font-weight: 600;
        color: #303133;
      }

      .stat-label {
        font-size: 12px;
        color: #909399;
        margin-top: 4px;
      }
    }
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .el-button {
      width: 100%;
    }
  }

  .reason-item {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #606266;
    padding: 4px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  }
}

:deep(.row-uncounted) {
  background-color: #fdf6ec !important;
}

:deep(.row-diff) {
  background-color: #fef0f0 !important;
}
</style>
