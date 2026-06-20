<template>
  <div class="stock-takes-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>库存盘点</span>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>
            发起盘点
          </el-button>
        </div>
      </template>

      <div class="filter-bar">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="全部" name="all" />
          <el-tab-pane label="草稿" name="DRAFT" />
          <el-tab-pane label="盘点中" name="IN_PROGRESS" />
          <el-tab-pane label="待复核" name="PENDING_REVIEW" />
          <el-tab-pane label="已完成" name="COMPLETED" />
        </el-tabs>
      </div>

      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索盘点单标题"
          clearable
          style="width: 300px"
          @clear="fetchStockTakes"
          @keyup.enter="fetchStockTakes"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-date-picker
          v-model="filterMonth"
          type="month"
          placeholder="按月份筛选"
          clearable
          style="width: 180px; margin-left: 12px"
          value-format="YYYY-MM"
          @change="fetchStockTakes"
        />
        <el-button type="primary" @click="fetchStockTakes" style="margin-left: 12px">搜索</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="stockTakes"
        style="width: 100%; margin-top: 16px"
        border
        stripe
      >
        <el-table-column prop="id" label="编号" width="70" />
        <el-table-column prop="title" label="盘点标题" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="goToDetail(row.id)">{{ row.title }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            {{ row.category?.name || '全部分类' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalBooks" label="图书种数" width="90" align="center" />
        <el-table-column label="账面库存" width="100" align="center">
          <template #default="{ row }">{{ row.totalExpectedQty }}</template>
        </el-table-column>
        <el-table-column label="实盘库存" width="100" align="center">
          <template #default="{ row }">{{ row.totalActualQty }}</template>
        </el-table-column>
        <el-table-column label="差异数量" width="100" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.totalDiffQty > 0 ? '#e6a23c' : row.totalDiffQty < 0 ? '#f56c6c' : '' }">
              {{ row.totalDiffQty > 0 ? '+' : '' }}{{ row.totalDiffQty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="差异金额" width="110" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.totalDiffAmount > 0 ? '#e6a23c' : row.totalDiffAmount < 0 ? '#f56c6c' : '' }">
              ¥{{ row.totalDiffAmount > 0 ? '+' : '' }}{{ row.totalDiffAmount.toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="创建人" width="100">
          <template #default="{ row }">{{ row.createdBy?.username || '-' }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goToDetail(row.id)">查看</el-button>
            <el-button
              v-if="row.status === 'DRAFT'"
              link
              type="primary"
              @click="openEditDialog(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'DRAFT'"
              link
              type="success"
              @click="handleGenerateSnapshot(row)"
            >
              生成快照
            </el-button>
            <el-button
              v-if="row.status === 'IN_PROGRESS'"
              link
              type="warning"
              @click="handleSubmitReview(row)"
            >
              提交复核
            </el-button>
            <el-button
              v-if="userStore.isAdmin && row.status === 'PENDING_REVIEW'"
              link
              type="success"
              @click="handleReview(row)"
            >
              复核通过
            </el-button>
            <el-button
              v-if="userStore.isAdmin && row.status === 'PENDING_REVIEW'"
              link
              type="warning"
              @click="handleReject(row)"
            >
              驳回
            </el-button>
            <el-button
              v-if="row.status !== 'COMPLETED' && userStore.isAdmin"
              link
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        background
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '发起盘点' : '编辑盘点单'"
      width="500px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="盘点标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入盘点标题" />
        </el-form-item>
        <el-form-item label="盘点分类">
          <el-select v-model="form.categoryId" placeholder="全部分类" clearable style="width: 100%">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
          <div class="form-tip">不选择则盘点所有分类图书</div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import type { FormInstance, FormRules } from 'element-plus';
import type { StockTake, StockTakeStatus, Category } from '../types';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const submitting = ref(false);
const stockTakes = ref<StockTake[]>([]);
const activeTab = ref('all');
const searchKeyword = ref('');
const filterMonth = ref('');
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingId = ref<number | null>(null);
const formRef = ref<FormInstance>();
const categories = ref<Category[]>([]);

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const form = reactive({
  title: '',
  categoryId: null as number | null,
  remark: '',
});

const rules: FormRules = {
  title: [
    { required: true, message: '请输入盘点标题', trigger: 'blur' },
  ],
};

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

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

const fetchCategories = async () => {
  try {
    const res: any = await api.get('/categories');
    categories.value = res;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }
};

const fetchStockTakes = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
    if (activeTab.value !== 'all') {
      params.status = activeTab.value;
    }
    if (searchKeyword.value) {
      params.keyword = searchKeyword.value;
    }
    if (filterMonth.value) {
      params.month = filterMonth.value;
    }
    const res: any = await api.get('/stock-takes', { params });
    stockTakes.value = res.data;
    pagination.total = res.total;
  } catch (error) {
    console.error('Failed to fetch stock takes:', error);
  } finally {
    loading.value = false;
  }
};

const handleTabChange = () => {
  pagination.page = 1;
  fetchStockTakes();
};

const handleSizeChange = () => {
  pagination.page = 1;
  fetchStockTakes();
};

const handleCurrentChange = () => {
  fetchStockTakes();
};

const goToDetail = (id: number) => {
  router.push(`/stock-takes/${id}`);
};

const openCreateDialog = () => {
  dialogMode.value = 'create';
  editingId.value = null;
  Object.assign(form, { title: '', categoryId: null, remark: '' });
  dialogVisible.value = true;
};

const openEditDialog = (row: StockTake) => {
  dialogMode.value = 'edit';
  editingId.value = row.id;
  Object.assign(form, {
    title: row.title,
    categoryId: row.categoryId || null,
    remark: row.remark || '',
  });
  dialogVisible.value = true;
};

const resetForm = () => {
  formRef.value?.resetFields();
  Object.assign(form, { title: '', categoryId: null, remark: '' });
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      const payload: any = {
        title: form.title,
        categoryId: form.categoryId,
        remark: form.remark || undefined,
      };
      if (dialogMode.value === 'create') {
        await api.post('/stock-takes', payload);
        ElMessage.success('盘点单创建成功');
      } else if (editingId.value) {
        await api.put(`/stock-takes/${editingId.value}`, payload);
        ElMessage.success('盘点单更新成功');
      }
      dialogVisible.value = false;
      fetchStockTakes();
    } catch (error) {
      ElMessage.error(dialogMode.value === 'create' ? '创建失败' : '更新失败');
    } finally {
      submitting.value = false;
    }
  });
};

const handleGenerateSnapshot = async (row: StockTake) => {
  try {
    await ElMessageBox.confirm(
      `确定要为盘点单「${row.title}」生成库存快照吗？生成后将锁定当前库存数据作为盘点基准。`,
      '确认生成快照',
      { type: 'warning' }
    );
    await api.post(`/stock-takes/${row.id}/generate-snapshot`);
    ElMessage.success('库存快照生成成功');
    fetchStockTakes();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('生成快照失败');
    }
  }
};

const handleSubmitReview = async (row: StockTake) => {
  try {
    await ElMessageBox.confirm(
      `确定要提交盘点单「${row.title}」进行复核吗？`,
      '确认提交复核',
      { type: 'warning' }
    );
    await api.post(`/stock-takes/${row.id}/submit`);
    ElMessage.success('已提交复核');
    fetchStockTakes();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('提交复核失败');
    }
  }
};

const handleReview = async (row: StockTake) => {
  try {
    await ElMessageBox.confirm(
      `复核通过后，系统将根据盘点结果自动调整库存。确定要通过盘点单「${row.title}」的复核吗？`,
      '确认复核通过',
      { type: 'warning' }
    );
    await api.post(`/stock-takes/${row.id}/review`, { remark: '复核通过' });
    ElMessage.success('复核通过，库存已调整');
    fetchStockTakes();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('复核失败');
    }
  }
};

const handleReject = async (row: StockTake) => {
  try {
    const { value } = (await ElMessageBox.prompt('请输入驳回原因', '驳回复核', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入驳回原因',
    })) as { value: string };
    await api.post(`/stock-takes/${row.id}/reject`, { remark: value || '驳回复核' });
    ElMessage.success('已驳回');
    fetchStockTakes();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('驳回失败');
    }
  }
};

const handleDelete = async (row: StockTake) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除盘点单「${row.title}」吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    );
    await api.delete(`/stock-takes/${row.id}`);
    ElMessage.success('删除成功');
    fetchStockTakes();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

onMounted(() => {
  fetchCategories();
  fetchStockTakes();
});
</script>

<style scoped lang="scss">
.stock-takes-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filter-bar {
    margin-bottom: 16px;
  }

  .search-bar {
    display: flex;
    gap: 0;
    align-items: center;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
</style>
