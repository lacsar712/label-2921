<template>
  <div class="donations-container">
    <el-card shadow="hover">
      <div class="header-actions">
        <span style="font-size: 16px; font-weight: 600; color: #303133;">
          捐赠管理
        </span>
        <div class="right-actions">
          <el-input
            v-model="filterDonorName"
            placeholder="搜索捐赠人"
            style="width: 180px; margin-right: 10px"
            clearable
            @clear="fetchDonations"
            @keyup.enter="fetchDonations"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="filterStatus"
            placeholder="状态筛选"
            clearable
            style="width: 140px; margin-right: 10px"
            @change="fetchDonations"
          >
            <el-option label="待审核" value="PENDING" />
            <el-option label="已审核" value="APPROVED" />
            <el-option label="已拒绝" value="REJECTED" />
            <el-option label="部分入库" value="PARTIAL_STOCKED" />
            <el-option label="已入库" value="STOCKED" />
          </el-select>
          <el-select
            v-model="filterChannel"
            placeholder="捐赠渠道"
            clearable
            style="width: 140px; margin-right: 10px"
            @change="fetchDonations"
          >
            <el-option label="个人捐赠" value="INDIVIDUAL" />
            <el-option label="机构捐赠" value="ORGANIZATION" />
            <el-option label="线上捐赠" value="ONLINE" />
            <el-option label="活动捐赠" value="EVENT" />
            <el-option label="其他" value="OTHER" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 260px; margin-right: 10px"
            value-format="YYYY-MM-DD"
            @change="fetchDonations"
          />
          <el-button
            v-if="userStore.isLibrarian"
            type="primary"
            :icon="Plus"
            @click="handleAdd"
          >
            新增捐赠
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="donations"
        style="width: 100%; margin-top: 20px"
        border
        stripe
      >
        <el-table-column prop="id" label="编号" width="80" align="center" />
        <el-table-column prop="donorName" label="捐赠人" min-width="120">
          <template #default="{ row }">
            <div>
              <div>{{ row.donorName }}</div>
              <div v-if="row.donorUnit" class="sub-text">{{ row.donorUnit }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="联系方式" width="160">
          <template #default="{ row }">
            <div>
              <div v-if="row.donorPhone">{{ row.donorPhone }}</div>
              <div v-if="row.donorEmail" class="sub-text">{{ row.donorEmail }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="渠道" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ getChannelLabel(row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalBooks" label="图书种数" width="90" align="center" />
        <el-table-column prop="totalQty" label="总册数" width="90" align="center" />
        <el-table-column label="总价值(元)" width="110" align="center">
          <template #default="{ row }">
            ¥{{ row.totalValue.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" effect="dark">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleDetail(row)">
              详情
            </el-button>
            <el-button
              v-if="row.status === 'PENDING' && userStore.isLibrarian"
              link
              type="primary"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'PENDING' && userStore.isAdmin"
              link
              type="success"
              @click="handleReview(row)"
            >
              审核
            </el-button>
            <el-button
              v-if="(row.status === 'APPROVED' || row.status === 'PARTIAL_STOCKED') && userStore.isLibrarian"
              link
              type="warning"
              @click="handleStockIn(row)"
            >
              入库
            </el-button>
            <el-button
              v-if="(row.status === 'PENDING' || row.status === 'REJECTED') && userStore.isAdmin"
              link
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchDonations"
          @current-change="fetchDonations"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="formDialogVisible"
      :title="isEdit ? '编辑捐赠单' : '新增捐赠单'"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="donationForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="捐赠人" prop="donorName">
              <el-input v-model="donationForm.donorName" placeholder="请输入捐赠人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位">
              <el-input v-model="donationForm.donorUnit" placeholder="请输入捐赠单位" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="donationForm.donorPhone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电子邮箱">
              <el-input v-model="donationForm.donorEmail" placeholder="请输入电子邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="捐赠渠道">
              <el-select v-model="donationForm.channel" style="width: 100%">
                <el-option label="个人捐赠" value="INDIVIDUAL" />
                <el-option label="机构捐赠" value="ORGANIZATION" />
                <el-option label="线上捐赠" value="ONLINE" />
                <el-option label="活动捐赠" value="EVENT" />
                <el-option label="其他" value="OTHER" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input
                v-model="donationForm.remark"
                type="textarea"
                :rows="2"
                placeholder="请输入备注"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          捐赠图书明细
          <el-button type="primary" size="small" :icon="Plus" @click="addBookItem" style="margin-left: 10px">
            添加图书
          </el-button>
        </el-divider>

        <div
          v-for="(item, index) in donationForm.items"
          :key="index"
          class="book-item"
        >
          <div class="book-item-header">
            <span class="book-item-title">图书 {{ index + 1 }}</span>
            <el-button
              v-if="donationForm.items.length > 1"
              link
              type="danger"
              :icon="Delete"
              @click="removeBookItem(index)"
            >
              删除
            </el-button>
          </div>
          <el-row :gutter="15">
            <el-col :span="12">
              <el-form-item
                label="书名"
                :prop="`items.${index}.title`"
                :rules="{ required: true, message: '请输入书名', trigger: 'blur' }"
              >
                <el-input v-model="item.title" placeholder="请输入书名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="ISBN">
                <el-input v-model="item.isbn" placeholder="请输入ISBN" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item
                label="数量"
                :prop="`items.${index}.quantity`"
                :rules="{ required: true, type: 'number', min: 1, message: '数量至少1册', trigger: 'blur' }"
              >
                <el-input-number
                  v-model="item.quantity"
                  :min="1"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="品相">
                <el-select v-model="item.condition" style="width: 100%">
                  <el-option label="全新" value="NEW" />
                  <el-option label="九成新" value="LIKE_NEW" />
                  <el-option label="良好" value="GOOD" />
                  <el-option label="一般" value="FAIR" />
                  <el-option label="较差" value="POOR" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="估价(元)">
                <el-input-number
                  v-model="item.estimatedValue"
                  :min="0"
                  :precision="2"
                  step="10"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="分类">
                <el-select v-model="item.categoryId" placeholder="请选择分类" style="width: 100%">
                  <el-option
                    v-for="cat in categories"
                    :key="cat.id"
                    :label="cat.name"
                    :value="cat.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="捐赠日期">
                <el-date-picker
                  v-model="item.donationDate"
                  type="date"
                  placeholder="选择日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input v-model="item.remark" placeholder="请输入备注" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="reviewDialogVisible"
      title="审核捐赠单"
      width="500px"
    >
      <el-form label-width="100px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="reviewResult">
            <el-radio label="APPROVED">通过</el-radio>
            <el-radio label="REJECTED">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input
            v-model="reviewRemark"
            type="textarea"
            :rows="4"
            placeholder="请输入审核意见"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="reviewLoading" @click="submitReview">
          提交
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      title="捐赠详情"
      width="900px"
    >
      <el-descriptions :column="3" border v-if="currentDonation">
        <el-descriptions-item label="捐赠编号">{{ currentDonation.id }}</el-descriptions-item>
        <el-descriptions-item label="捐赠人">{{ currentDonation.donorName }}</el-descriptions-item>
        <el-descriptions-item label="单位">{{ currentDonation.donorUnit || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentDonation.donorPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="电子邮箱">{{ currentDonation.donorEmail || '-' }}</el-descriptions-item>
        <el-descriptions-item label="捐赠渠道">
          {{ getChannelLabel(currentDonation.channel) }}
        </el-descriptions-item>
        <el-descriptions-item label="图书种数">{{ currentDonation.totalBooks }}</el-descriptions-item>
        <el-descriptions-item label="总册数">{{ currentDonation.totalQty }}</el-descriptions-item>
        <el-descriptions-item label="总价值">¥{{ currentDonation.totalValue.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(currentDonation.status)" effect="dark">
            {{ getStatusLabel(currentDonation.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDate(currentDonation.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建人">
          {{ currentDonation.createdBy?.username || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="3">
          {{ currentDonation.remark || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">捐赠图书明细</el-divider>
      <el-table :data="currentDonation?.items || []" border size="small">
        <el-table-column prop="title" label="书名" min-width="180" />
        <el-table-column prop="isbn" label="ISBN" width="160">
          <template #default="{ row }">{{ row.isbn || '-' }}</template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">{{ row.category?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="品相" width="90" align="center">
          <template #default="{ row }">{{ getConditionLabel(row.condition) }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="捐赠数" width="80" align="center" />
        <el-table-column label="已入库" width="80" align="center">
          <template #default="{ row }">{{ row.stockedQty }}</template>
        </el-table-column>
        <el-table-column label="估价(元)" width="100" align="center">
          <template #default="{ row }">¥{{ row.estimatedValue.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="入库去向" width="150">
          <template #default="{ row }">
            <div v-if="row.bookId && row.book">
              <el-link type="primary" @click="goToBook(row.bookId)">
                {{ row.book.title }}
              </el-link>
              <div class="sub-text">库存: {{ row.book.stock }}册</div>
            </div>
            <span v-else class="sub-text">未入库</span>
          </template>
        </el-table-column>
      </el-table>

      <el-divider content-position="left">状态流转记录</el-divider>
      <el-timeline v-if="currentDonation?.statusLogs?.length">
        <el-timeline-item
          v-for="log in currentDonation.statusLogs"
          :key="log.id"
          :timestamp="formatDate(log.createdAt)"
          :type="getStatusTimelineType(log.toStatus)"
        >
          <el-tag :type="getStatusTagType(log.toStatus)" effect="dark" size="small">
            {{ getStatusLabel(log.toStatus) }}
          </el-tag>
          <span style="margin-left: 10px">{{ log.remark || '' }}</span>
          <span v-if="log.operator" class="sub-text" style="margin-left: 10px">
            - {{ log.operator.username }}
          </span>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无流转记录" :image-size="80" />
    </el-dialog>

    <el-dialog
      v-model="stockInDialogVisible"
      title="图书入库"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="stock-in-info">
        <el-alert
          title="提示：选择需要入库的图书，设置分类和数量后点击入库。"
          type="info"
          :closable="false"
          show-icon
        />
      </div>

      <el-table
        :data="stockInItems"
        border
        style="margin-top: 15px"
        @selection-change="handleStockInSelection"
      >
        <el-table-column type="selection" width="55" :selectable="checkStockInSelectable" />
        <el-table-column prop="title" label="书名" min-width="160" />
        <el-table-column prop="isbn" label="ISBN" width="140">
          <template #default="{ row }">{{ row.isbn || '-' }}</template>
        </el-table-column>
        <el-table-column label="待入库数" width="90" align="center">
          <template #default="{ row }">
            {{ row.quantity - row.stockedQty }}
          </template>
        </el-table-column>
        <el-table-column label="入库数量" width="140">
          <template #default="{ row }">
            <el-input-number
              v-model="row._stockQty"
              :min="0"
              :max="row.quantity - row.stockedQty"
              size="small"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="入库分类" width="180">
          <template #default="{ row }">
            <el-select
              v-model="row._categoryId"
              placeholder="选择分类"
              size="small"
              style="width: 100%"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="价格(元)" width="120">
          <template #default="{ row }">
            <el-input-number
              v-model="row._price"
              :min="0"
              :precision="2"
              size="small"
              style="width: 100%"
            />
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="stockInDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="stockInLoading" @click="submitStockIn">
          确认入库
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Search, Plus, Delete } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import api from '../api';
import { useUserStore } from '../store/user';
import type {
  Donation,
  DonationForm,
  DonationStatus,
  BookCondition,
  DonationChannel,
  Category,
} from '../types';

const router = useRouter();
const userStore = useUserStore();
const donations = ref<Donation[]>([]);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const filterDonorName = ref('');
const filterStatus = ref('');
const filterChannel = ref('');
const dateRange = ref<string[]>([]);

const categories = ref<Category[]>([]);

const formDialogVisible = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance | null>(null);
const isEdit = ref(false);
const editId = ref<number | null>(null);
const donationForm = reactive<DonationForm>({
  donorName: '',
  donorUnit: '',
  donorPhone: '',
  donorEmail: '',
  channel: 'INDIVIDUAL',
  remark: '',
  items: [],
});

const formRules = {
  donorName: [{ required: true, message: '请输入捐赠人姓名', trigger: 'blur' }],
};

const reviewDialogVisible = ref(false);
const reviewLoading = ref(false);
const reviewResult = ref<DonationStatus>('APPROVED');
const reviewRemark = ref('');
const currentDonationId = ref<number | null>(null);

const detailDialogVisible = ref(false);
const currentDonation = ref<Donation | null>(null);

const stockInDialogVisible = ref(false);
const stockInLoading = ref(false);
const stockInItems = ref<any[]>([]);

const fetchCategories = async () => {
  try {
    const res: any = await api.get('/categories');
    categories.value = res;
  } catch (error) {
    console.error('Failed to fetch categories', error);
  }
};

const fetchDonations = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value,
    };
    if (filterDonorName.value) params.donorName = filterDonorName.value;
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterChannel.value) params.channel = filterChannel.value;
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const res: any = await api.get('/donations', { params });
    donations.value = res.data;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
};

const getStatusLabel = (status: DonationStatus) => {
  const map: Record<DonationStatus, string> = {
    PENDING: '待审核',
    APPROVED: '已审核',
    REJECTED: '已拒绝',
    PARTIAL_STOCKED: '部分入库',
    STOCKED: '已入库',
  };
  return map[status] || status;
};

const getStatusTagType = (status: DonationStatus) => {
  const map: Record<DonationStatus, string> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    PARTIAL_STOCKED: 'info',
    STOCKED: 'success',
  };
  return map[status] || 'info';
};

const getStatusTimelineType = (status: DonationStatus) => {
  const map: Record<DonationStatus, string> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    PARTIAL_STOCKED: 'primary',
    STOCKED: 'success',
  };
  return map[status] || 'primary';
};

const getChannelLabel = (channel: DonationChannel) => {
  const map: Record<DonationChannel, string> = {
    INDIVIDUAL: '个人捐赠',
    ORGANIZATION: '机构捐赠',
    ONLINE: '线上捐赠',
    EVENT: '活动捐赠',
    OTHER: '其他',
  };
  return map[channel] || channel;
};

const getConditionLabel = (condition: BookCondition) => {
  const map: Record<BookCondition, string> = {
    NEW: '全新',
    LIKE_NEW: '九成新',
    GOOD: '良好',
    FAIR: '一般',
    POOR: '较差',
  };
  return map[condition] || condition;
};

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

const addBookItem = () => {
  donationForm.items.push({
    title: '',
    isbn: '',
    quantity: 1,
    condition: 'GOOD',
    estimatedValue: 0,
    categoryId: null,
    remark: '',
  });
};

const removeBookItem = (index: number) => {
  donationForm.items.splice(index, 1);
};

const resetForm = () => {
  donationForm.donorName = '';
  donationForm.donorUnit = '';
  donationForm.donorPhone = '';
  donationForm.donorEmail = '';
  donationForm.channel = 'INDIVIDUAL';
  donationForm.remark = '';
  donationForm.items = [];
};

const handleAdd = () => {
  isEdit.value = false;
  editId.value = null;
  resetForm();
  addBookItem();
  formDialogVisible.value = true;
};

const handleEdit = (row: Donation) => {
  isEdit.value = true;
  editId.value = row.id;
  resetForm();
  donationForm.donorName = row.donorName;
  donationForm.donorUnit = row.donorUnit || '';
  donationForm.donorPhone = row.donorPhone || '';
  donationForm.donorEmail = row.donorEmail || '';
  donationForm.channel = row.channel;
  donationForm.remark = row.remark || '';
  donationForm.items = row.items.map((item) => ({
    title: item.title,
    isbn: item.isbn || '',
    quantity: item.quantity,
    condition: item.condition,
    estimatedValue: item.estimatedValue,
    donationDate: item.donationDate ? item.donationDate.split('T')[0] : '',
    categoryId: item.categoryId || null,
    remark: item.remark || '',
  }));
  formDialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitLoading.value = true;
      try {
        if (isEdit.value && editId.value) {
          await api.put(`/donations/${editId.value}`, donationForm);
          ElMessage.success('更新成功');
        } else {
          await api.post('/donations', donationForm);
          ElMessage.success('创建成功');
        }
        formDialogVisible.value = false;
        fetchDonations();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const handleDelete = (row: Donation) => {
  ElMessageBox.confirm('确定要删除该捐赠单吗？', '警告', { type: 'warning' }).then(async () => {
    try {
      await api.delete(`/donations/${row.id}`);
      ElMessage.success('删除成功');
      fetchDonations();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};

const handleReview = (row: Donation) => {
  currentDonationId.value = row.id;
  reviewResult.value = 'APPROVED';
  reviewRemark.value = '';
  reviewDialogVisible.value = true;
};

const submitReview = async () => {
  if (!currentDonationId.value) return;
  reviewLoading.value = true;
  try {
    await api.post(`/donations/${currentDonationId.value}/review`, {
      status: reviewResult.value,
      remark: reviewRemark.value,
    });
    ElMessage.success('审核成功');
    reviewDialogVisible.value = false;
    fetchDonations();
  } finally {
    reviewLoading.value = false;
  }
};

const handleDetail = async (row: Donation) => {
  try {
    const res: any = await api.get(`/donations/${row.id}`);
    currentDonation.value = res;
    detailDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('获取详情失败');
  }
};

const goToBook = (_bookId: number) => {
  router.push(`/books`);
};

const handleStockIn = async (row: Donation) => {
  try {
    const res: any = await api.get(`/donations/${row.id}/stock-info`);
    stockInItems.value = res.map((item: any) => ({
      ...item,
      _stockQty: item.quantity - item.stockedQty,
      _categoryId: item.categoryId || (categories.value[0]?.id || null),
      _price: item.estimatedValue,
    }));
    stockInDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('获取入库信息失败');
  }
};

const checkStockInSelectable = (row: any) => {
  return row.quantity - row.stockedQty > 0;
};

const handleStockInSelection = (selection: any[]) => {
  console.log('selection', selection);
};

const submitStockIn = async () => {
  if (!currentDonationId.value && stockInItems.value.length === 0) return;

  const stockInData = stockInItems.value
    .filter((item) => item._stockQty > 0 && item._categoryId)
    .map((item) => ({
      itemId: item.id,
      bookId: item.bookId || undefined,
      categoryId: item._categoryId,
      quantity: item._stockQty,
      price: item._price,
    }));

  if (stockInData.length === 0) {
    ElMessage.warning('请选择要入库的图书并设置分类和数量');
    return;
  }

  const donationId = stockInItems.value[0]?.donationId;
  if (!donationId) return;

  stockInLoading.value = true;
  try {
    await api.post(`/donations/${donationId}/stock-in`, {
      items: stockInData,
    });
    ElMessage.success('入库成功');
    stockInDialogVisible.value = false;
    fetchDonations();
  } finally {
    stockInLoading.value = false;
  }
};

onMounted(() => {
  fetchCategories();
  fetchDonations();
});
</script>

<style scoped lang="scss">
.donations-container {
  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .right-actions {
      display: flex;
      align-items: center;
    }
  }

  .sub-text {
    font-size: 12px;
    color: #909399;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .book-item {
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 15px;
    background-color: #fafafa;

    .book-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .book-item-title {
        font-weight: 600;
        color: #303133;
      }
    }
  }

  .stock-in-info {
    margin-bottom: 10px;
  }
}
</style>
