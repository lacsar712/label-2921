<template>
  <div class="books-container">
    <div class="content-wrapper">
      <el-aside class="sidebar" width="260px">
        <el-card shadow="hover" class="tag-sidebar">
          <div class="sidebar-header">
            <span class="sidebar-title">标签筛选</span>
            <el-button
              v-if="selectedTagIds.length > 0"
              link
              type="primary"
              size="small"
              @click="clearTagFilter"
            >
              清除
            </el-button>
          </div>
          <div class="tag-list">
            <div
              v-for="tag in tagsWithStats"
              :key="tag.id"
              class="tag-item"
              :class="{ active: selectedTagIds.includes(tag.id) }"
              @click="toggleTag(tag.id)"
            >
              <div class="tag-left">
                <span
                  class="tag-color-dot"
                  :style="{ backgroundColor: tag.color }"
                />
                <span class="tag-name">{{ tag.name }}</span>
              </div>
              <div class="tag-right">
                <span class="tag-count">{{ tag.bookCount || tag._count?.bookTags || 0 }}</span>
                <span
                  v-if="tag.recentBorrowCount"
                  class="tag-hot"
                >
                  <el-icon><TrendCharts /></el-icon>
                  {{ tag.recentBorrowCount }}
                </span>
              </div>
            </div>
            <div v-if="tagsWithStats.length === 0" class="empty-tags">
              暂无标签
            </div>
          </div>
          <div class="filter-mode">
            <el-radio-group
              v-model="filterMode"
              size="small"
              @change="fetchBooks"
            >
              <el-radio-button value="intersection">
                交集
              </el-radio-button>
              <el-radio-button value="union">
                并集
              </el-radio-button>
            </el-radio-group>
          </div>
        </el-card>
      </el-aside>

      <el-main class="main-content">
        <el-card shadow="hover">
          <div class="header-actions">
            <el-input
              v-model="search"
              placeholder="搜索书名、作者或 ISBN"
              style="width: 300px"
              clearable
              @clear="fetchBooks"
              @keyup.enter="fetchBooks"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <div class="right">
              <el-select
                v-model="filterCategory"
                placeholder="全部分类"
                clearable
                style="width: 150px; margin-right: 10px"
                @change="fetchBooks"
              >
                <el-option
                  v-for="cat in categories"
                  :key="cat.id"
                  :label="cat.name"
                  :value="cat.id"
                />
              </el-select>
              <el-button
                v-if="userStore.isLibrarian"
                type="primary"
                :icon="Plus"
                @click="handleAdd"
              >
                添加图书
              </el-button>
            </div>
          </div>

          <el-table
            v-loading="loading"
            :data="books"
            style="width: 100%; margin-top: 20px"
            border
            stripe
          >
            <el-table-column
              prop="title"
              label="书名"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column
              prop="author"
              label="作者"
              width="100"
            />
            <el-table-column
              prop="isbn"
              label="ISBN"
              width="130"
            />
            <el-table-column
              prop="category.name"
              label="分类"
              width="100"
            />
            <el-table-column
              label="出版社"
              width="140"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <span v-if="row.publisher">{{ row.publisher.name }}</span>
                <span v-else class="text-grey">-</span>
              </template>
            </el-table-column>
            <el-table-column
              label="标签"
              min-width="200"
            >
              <template #default="{ row }">
                <div class="book-tags">
                  <el-tag
                    v-for="tag in row.tags?.slice(0, 3)"
                    :key="tag.id"
                    :color="tag.color"
                    effect="dark"
                    size="small"
                    style="margin-right: 4px; margin-bottom: 4px"
                  >
                    {{ tag.name }}
                  </el-tag>
                  <el-tag
                    v-if="row.tags?.length > 3"
                    type="info"
                    size="small"
                  >
                    +{{ row.tags.length - 3 }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              prop="price"
              label="价格"
              width="80"
            >
              <template #default="{ row }">
                ¥{{ row.price.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column
              prop="stock"
              label="库存"
              width="80"
            >
              <template #default="{ row }">
                <el-tag :type="row.stock > 0 ? 'success' : 'danger'">
                  {{ row.stock }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="评分"
              width="130"
            >
              <template #default="{ row }">
                <div v-if="row.reviewCount > 0" class="rating-cell">
                  <el-rate
                    :model-value="row.avgRating"
                    disabled
                    size="small"
                  />
                  <span class="rating-score">{{ row.avgRating }}</span>
                </div>
                <span v-else class="text-grey">暂无</span>
              </template>
            </el-table-column>
            <el-table-column
              label="评价数"
              width="80"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="row.reviewCount > 0"
                  type="primary"
                  effect="plain"
                  size="small"
                >
                  {{ row.reviewCount }}
                </el-tag>
                <span v-else class="text-grey">0</span>
              </template>
            </el-table-column>
            <el-table-column
              label="在借数量"
              width="90"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="row.borrowedCount > 0"
                  type="warning"
                >
                  {{ row.borrowedCount }}
                </el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="300"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  :disabled="row.stock <= 0"
                  @click="handleBorrow(row)"
                >
                  借阅
                </el-button>
                <el-button
                  link
                  type="warning"
                  :disabled="row.stock > 0"
                  @click="handleReserve(row)"
                >
                  预约
                </el-button>
                <el-button
                  link
                  type="success"
                  :disabled="row.borrowedCount === 0"
                  @click="handleReturn(row)"
                >
                  归还
                </el-button>
                <el-button
                  v-if="userStore.isLibrarian"
                  link
                  type="primary"
                  @click="handleEdit(row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="userStore.isAdmin"
                  link
                  type="danger"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="550px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item
          label="书名"
          prop="title"
        >
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item
          label="作者"
          prop="author"
        >
          <el-input v-model="form.author" />
        </el-form-item>
        <el-form-item
          label="ISBN"
          prop="isbn"
        >
          <el-input v-model="form.isbn" />
        </el-form-item>
        <el-form-item
          label="分类"
          prop="categoryId"
        >
          <el-select
            v-model="form.categoryId"
            placeholder="请选择分类"
            style="width: 100%"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="出版社"
          prop="publisherId"
        >
          <el-select
            v-model="form.publisherId"
            placeholder="请选择出版社"
            style="width: 100%"
            filterable
            clearable
          >
            <el-option
              v-for="pub in publishers"
              :key="pub.id"
              :label="pub.name"
              :value="pub.id"
            />
          </el-select>
          <div style="margin-top: 8px">
            <el-button
              type="primary"
              link
              size="small"
              :icon="Plus"
              @click="openQuickPublisher"
            >
              快速添加出版社
            </el-button>
          </div>
        </el-form-item>
        <el-form-item
          label="标签"
          prop="tagIds"
        >
          <el-select
            v-model="form.tagIds"
            multiple
            filterable
            placeholder="请选择标签"
            style="width: 100%"
            :reserve-keyword="false"
          >
            <el-option
              v-for="tag in allTags"
              :key="tag.id"
              :label="tag.name"
              :value="tag.id"
            >
              <span style="display: flex; align-items: center; gap: 8px;">
                <span
                  class="color-dot"
                  :style="{ backgroundColor: tag.color }"
                />
                {{ tag.name }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="hotTags.length > 0"
          label="热门标签"
        >
          <div class="hot-tags">
            <span
              v-for="tag in hotTags"
              :key="tag.id"
              class="hot-tag-item"
              :class="{ selected: form.tagIds?.includes(tag.id) }"
              @click="toggleHotTag(tag.id)"
            >
              <span
                class="hot-tag-color"
                :style="{ backgroundColor: tag.color }"
              />
              {{ tag.name }}
            </span>
          </div>
        </el-form-item>
        <el-form-item
          label="价格"
          prop="price"
        >
          <el-input-number
            v-model="form.price"
            :precision="2"
            :step="0.1"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="库存"
          prop="stock"
        >
          <el-input-number
            v-model="form.stock"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="描述"
          prop="description"
        >
          <el-input
            v-model="form.description"
            type="textarea"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="submitForm"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="borrowDialogVisible"
      title="图书借阅"
      width="400px"
    >
      <el-form
        ref="borrowFormRef"
        :model="borrowForm"
        :rules="borrowRules"
        label-width="100px"
      >
        <el-form-item label="图书">
          <el-input
            v-model="borrowForm.bookTitle"
            disabled
          />
        </el-form-item>
        <el-form-item
          label="借阅用户"
          prop="borrowerId"
        >
          <el-select
            v-model="borrowForm.borrowerId"
            placeholder="请选择借阅用户"
            style="width: 100%"
          >
            <el-option
              v-for="borrower in borrowers"
              :key="borrower.id"
              :label="borrower.name"
              :value="borrower.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="borrowDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="borrowSubmitting"
          @click="submitBorrow"
        >
          确定借阅
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="returnDialogVisible"
      title="图书归还"
      width="500px"
    >
      <el-form
        ref="returnFormRef"
        :model="returnForm"
        label-width="100px"
      >
        <el-form-item label="图书">
          <el-input
            v-model="returnForm.bookTitle"
            disabled
          />
        </el-form-item>
        <el-form-item label="借阅记录">
          <el-select
            v-model="returnForm.borrowId"
            placeholder="请选择要归还的借阅记录"
            style="width: 100%"
          >
            <el-option
              v-for="record in bookBorrowRecords"
              :key="record.id"
              :label="`${record.borrower.name} - ${formatDate(record.borrowDate)}`"
              :value="record.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="success"
          :loading="returnSubmitting"
          @click="submitReturn"
        >
          确定归还
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="reserveDialogVisible"
      title="图书预约"
      width="400px"
    >
      <el-form
        ref="reserveFormRef"
        :model="reserveForm"
        :rules="reserveRules"
        label-width="100px"
      >
        <el-form-item label="图书">
          <el-input
            v-model="reserveForm.bookTitle"
            disabled
          />
        </el-form-item>
        <el-form-item
          label="预约用户"
          prop="borrowerId"
        >
          <el-select
            v-model="reserveForm.borrowerId"
            placeholder="请选择预约用户"
            style="width: 100%"
          >
            <el-option
              v-for="borrower in borrowers"
              :key="borrower.id"
              :label="borrower.name"
              :value="borrower.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reserveDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="warning"
          :loading="reserveSubmitting"
          @click="submitReserve"
        >
          确定预约
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="quickPublisherVisible"
      title="快速添加出版社"
      width="450px"
    >
      <el-form
        ref="quickPublisherFormRef"
        :model="quickPublisherForm"
        :rules="quickPublisherRules"
        label-width="100px"
      >
        <el-form-item
          label="名称"
          prop="name"
        >
          <el-input v-model="quickPublisherForm.name" />
        </el-form-item>
        <el-form-item label="所在地">
          <el-input v-model="quickPublisherForm.location" />
        </el-form-item>
        <el-form-item label="邮编">
          <el-input v-model="quickPublisherForm.postalCode" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="quickPublisherForm.phone" />
        </el-form-item>
        <el-form-item label="官网">
          <el-input
            v-model="quickPublisherForm.website"
            placeholder="https://"
          />
        </el-form-item>
        <el-form-item
          label="合作等级"
          prop="cooperationLevel"
        >
          <el-select
            v-model="quickPublisherForm.cooperationLevel"
            style="width: 100%"
          >
            <el-option label="A级" value="A" />
            <el-option label="B级" value="B" />
            <el-option label="C级" value="C" />
            <el-option label="D级" value="D" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quickPublisherVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="quickPublisherSubmitting"
          @click="submitQuickPublisher"
        >
          确定添加
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="reviewDialogVisible"
      title="图书评价"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-alert
        type="success"
        :closable="false"
        style="margin-bottom: 16px"
      >
        图书归还成功！欢迎您对借阅的图书进行评价。
      </el-alert>
      <el-descriptions
        :column="1"
        border
        size="small"
        style="margin-bottom: 20px"
      >
        <el-descriptions-item label="图书名称">
          {{ reviewForm.bookTitle }}
        </el-descriptions-item>
        <el-descriptions-item label="借阅用户">
          {{ reviewForm.borrowerName }}
        </el-descriptions-item>
      </el-descriptions>
      <el-form
        ref="reviewFormRef"
        :model="reviewForm"
        :rules="reviewRules"
        label-width="80px"
      >
        <el-form-item
          label="评分"
          prop="rating"
        >
          <el-rate v-model="reviewForm.rating" />
        </el-form-item>
        <el-form-item
          label="评价内容"
          prop="comment"
        >
          <el-input
            v-model="reviewForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请分享您对这本书的阅读感受（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleSkipReview">
          稍后评价
        </el-button>
        <el-button
          type="primary"
          :loading="reviewSubmitting"
          @click="submitReview"
        >
          提交评价
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { Search, Plus, TrendCharts } from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type { Tag, Book, Publisher, CooperationLevel } from '../types';

const userStore = useUserStore();
const books = ref<Book[]>([]);
const categories = ref<any[]>([]);
const publishers = ref<Publisher[]>([]);
const borrowers = ref<any[]>([]);
const allTags = ref<Tag[]>([]);
const hotTags = ref<Tag[]>([]);
const tagsWithStats = ref<Tag[]>([]);
const loading = ref(false);
const search = ref('');
const filterCategory = ref('');
const selectedTagIds = ref<number[]>([]);
const filterMode = ref<'intersection' | 'union'>('intersection');

const dialogVisible = ref(false);
const dialogTitle = ref('添加图书');
const submitLoading = ref(false);
const formRef = ref<FormInstance | null>(null);
const isEdit = ref(false);

const borrowDialogVisible = ref(false);
const borrowSubmitting = ref(false);
const borrowFormRef = ref<FormInstance | null>(null);
const borrowForm = reactive({
  bookId: undefined as number | undefined,
  bookTitle: '',
  borrowerId: undefined as number | undefined
});
const borrowRules = {
  borrowerId: [{ required: true, message: '请选择借阅用户', trigger: 'change' }]
};

const returnDialogVisible = ref(false);
const returnSubmitting = ref(false);
const returnForm = reactive({
  bookId: undefined as number | undefined,
  bookTitle: '',
  borrowId: undefined as number | undefined
});
const bookBorrowRecords = ref<any[]>([]);

const reserveDialogVisible = ref(false);
const reserveSubmitting = ref(false);
const reserveFormRef = ref<FormInstance | null>(null);
const reserveForm = reactive({
  bookId: undefined as number | undefined,
  bookTitle: '',
  borrowerId: undefined as number | undefined
});
const reserveRules = {
  borrowerId: [{ required: true, message: '请选择预约用户', trigger: 'change' }]
};

const quickPublisherVisible = ref(false);
const quickPublisherSubmitting = ref(false);
const quickPublisherFormRef = ref<FormInstance | null>(null);
const quickPublisherForm = reactive({
  name: '',
  location: '',
  postalCode: '',
  phone: '',
  website: '',
  cooperationLevel: 'B' as CooperationLevel,
});
const quickPublisherRules = {
  name: [{ required: true, message: '请输入出版社名称', trigger: 'blur' }],
  cooperationLevel: [{ required: true, message: '请选择合作等级', trigger: 'change' }],
};

const reviewDialogVisible = ref(false);
const reviewSubmitting = ref(false);
const reviewFormRef = ref<FormInstance | null>(null);
const reviewForm = reactive({
  borrowRecordId: undefined as number | undefined,
  bookId: undefined as number | undefined,
  bookTitle: '',
  borrowerId: undefined as number | undefined,
  borrowerName: '',
  rating: 5,
  comment: '',
});
const reviewRules = {
  rating: [{ required: true, message: '请选择评分', trigger: 'change' }],
};

const form = reactive({
  id: undefined as number | undefined,
  title: '',
  author: '',
  isbn: '',
  categoryId: undefined as number | undefined,
  publisherId: undefined as number | undefined,
  tagIds: [] as number[],
  price: 0,
  stock: 0,
  description: ''
});

const validateNumber = (_: any, value: number, cb: any) => {
  if (value === undefined || value === null || isNaN(Number(value))) return cb('请输入有效数字');
  if (Number(value) < 0) return cb('数值需大于等于0');
  return cb();
};

const rules = {
  title: [{ required: true, message: '请输入书名', trigger: 'blur' }],
  author: [{ required: true, message: '请输入作者', trigger: 'blur' }],
  isbn: [
    { required: true, message: '请输入ISBN', trigger: 'blur' },
    { min: 5, message: 'ISBN 至少5位', trigger: 'blur' }
  ],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ validator: validateNumber, trigger: 'blur' }],
  stock: [{ validator: validateNumber, trigger: 'blur' }]
};

const fetchBooks = async () => {
  loading.value = true;
  try {
    const params: any = {
      search: search.value,
      categoryId: filterCategory.value,
      tagFilterMode: filterMode.value,
    };
    if (selectedTagIds.value.length > 0) {
      params.tagIds = selectedTagIds.value.join(',');
    }
    const res: any = await api.get('/books', { params });
    const booksWithBorrowCount = await Promise.all(
      res.map(async (book: any) => {
        const borrowCountRes: any = await api.get(`/books/${book.id}/borrow-count`);
        return { ...book, borrowedCount: borrowCountRes.count || 0 };
      })
    );
    books.value = booksWithBorrowCount;
  } finally {
    loading.value = false;
  }
};

const fetchCategories = async () => {
  const res: any = await api.get('/categories');
  categories.value = res;
};

const fetchTags = async () => {
  const res: any = await api.get('/tags');
  allTags.value = res;
};

const fetchHotTags = async () => {
  try {
    const res: any = await api.get('/tags/hot', { params: { limit: 8 } });
    hotTags.value = res;
  } catch (error) {
    console.error('Failed to fetch hot tags:', error);
  }
};

const fetchTagsWithStats = async () => {
  try {
    const res: any = await api.get('/tags/with-stats');
    tagsWithStats.value = res;
  } catch (error) {
    console.error('Failed to fetch tags with stats:', error);
  }
};

const fetchBorrowers = async () => {
  try {
    const res: any = await api.get('/borrowers');
    borrowers.value = res;
  } catch (error) {
    console.error('Failed to fetch borrowers:', error);
  }
};

const fetchPublishers = async () => {
  try {
    const res: any = await api.get('/publishers');
    publishers.value = res;
  } catch (error) {
    console.error('Failed to fetch publishers:', error);
  }
};

const openQuickPublisher = () => {
  Object.assign(quickPublisherForm, {
    name: '',
    location: '',
    postalCode: '',
    phone: '',
    website: '',
    cooperationLevel: 'B' as CooperationLevel,
  });
  quickPublisherVisible.value = true;
};

const submitQuickPublisher = async () => {
  if (!quickPublisherFormRef.value) return;
  await quickPublisherFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      quickPublisherSubmitting.value = true;
      try {
        const res: any = await api.post('/publishers', quickPublisherForm);
        ElMessage.success('出版社添加成功');
        form.publisherId = res.id;
        quickPublisherVisible.value = false;
        fetchPublishers();
      } finally {
        quickPublisherSubmitting.value = false;
      }
    }
  });
};

const toggleTag = (tagId: number) => {
  const index = selectedTagIds.value.indexOf(tagId);
  if (index > -1) {
    selectedTagIds.value.splice(index, 1);
  } else {
    selectedTagIds.value.push(tagId);
  }
  fetchBooks();
};

const clearTagFilter = () => {
  selectedTagIds.value = [];
  fetchBooks();
};

const toggleHotTag = (tagId: number) => {
  const index = form.tagIds.indexOf(tagId);
  if (index > -1) {
    form.tagIds.splice(index, 1);
  } else {
    form.tagIds.push(tagId);
  }
};

const handleAdd = () => {
  isEdit.value = false;
  dialogTitle.value = '添加图书';
  Object.assign(form, {
    id: undefined,
    title: '',
    author: '',
    isbn: '',
    categoryId: undefined,
    publisherId: undefined,
    tagIds: [],
    price: 0,
    stock: 0,
    description: ''
  });
  dialogVisible.value = true;
};

const handleEdit = (row: Book) => {
  isEdit.value = true;
  dialogTitle.value = '编辑图书';
  Object.assign(form, {
    id: row.id,
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    categoryId: row.categoryId,
    publisherId: row.publisherId || undefined,
    tagIds: row.tags?.map((t) => t.id) || [],
    price: row.price,
    stock: row.stock,
    description: row.description || ''
  });
  dialogVisible.value = true;
};

const handleDelete = (row: Book) => {
  ElMessageBox.confirm('确定要删除这本书吗？', '警告', { type: 'warning' }).then(async () => {
    await api.delete(`/books/${row.id}`);
    ElMessage.success('删除成功');
    fetchBooks();
    fetchTagsWithStats();
  });
};

const handleBorrow = (row: Book) => {
  borrowForm.bookId = row.id;
  borrowForm.bookTitle = row.title;
  borrowForm.borrowerId = undefined;
  borrowDialogVisible.value = true;
};

const handleReturn = async (row: Book) => {
  returnForm.bookId = row.id;
  returnForm.bookTitle = row.title;
  returnForm.borrowId = undefined;
  returnDialogVisible.value = true;
  try {
    const res: any = await api.get(`/books/${row.id}/current-borrows`);
    bookBorrowRecords.value = res;
  } catch (error) {
    bookBorrowRecords.value = [];
  }
};

const handleReserve = (row: Book) => {
  reserveForm.bookId = row.id;
  reserveForm.bookTitle = row.title;
  reserveForm.borrowerId = undefined;
  reserveDialogVisible.value = true;
};

const submitReturn = async () => {
  if (!returnForm.borrowId) {
    ElMessage.warning('请选择要归还的借阅记录');
    return;
  }
  returnSubmitting.value = true;
  try {
    await api.post(`/borrows/${returnForm.borrowId}/return`);
    ElMessage.success('归还成功');
    returnDialogVisible.value = false;

    const selectedRecord = bookBorrowRecords.value.find((r) => r.id === returnForm.borrowId);
    if (selectedRecord) {
      Object.assign(reviewForm, {
        borrowRecordId: returnForm.borrowId,
        bookId: returnForm.bookId,
        bookTitle: returnForm.bookTitle,
        borrowerId: selectedRecord.borrower.id,
        borrowerName: selectedRecord.borrower.name,
        rating: 5,
        comment: '',
      });
      reviewDialogVisible.value = true;
    }

    fetchBooks();
    fetchTagsWithStats();
  } catch (error) {
    ElMessage.error('归还失败');
  } finally {
    returnSubmitting.value = false;
  }
};

const submitReview = async () => {
  if (!reviewFormRef.value) return;
  await reviewFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      reviewSubmitting.value = true;
      try {
        await api.post('/reviews', {
          borrowRecordId: reviewForm.borrowRecordId,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        });
        ElMessage.success('评价提交成功');
        reviewDialogVisible.value = false;
        fetchBooks();
      } finally {
        reviewSubmitting.value = false;
      }
    }
  });
};

const handleSkipReview = () => {
  reviewDialogVisible.value = false;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

const submitBorrow = async () => {
  if (!borrowFormRef.value) return;
  await borrowFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      borrowSubmitting.value = true;
      try {
        await api.post('/borrows', {
          bookId: borrowForm.bookId,
          borrowerId: borrowForm.borrowerId
        });
        ElMessage.success('借阅成功');
        borrowDialogVisible.value = false;
        fetchBooks();
        fetchTagsWithStats();
      } catch (error) {
        ElMessage.error('借阅失败');
      } finally {
        borrowSubmitting.value = false;
      }
    }
  });
};

const submitReserve = async () => {
  if (!reserveFormRef.value) return;
  await reserveFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      reserveSubmitting.value = true;
      try {
        const res: any = await api.post('/reservations', {
          bookId: reserveForm.bookId,
          borrowerId: reserveForm.borrowerId
        });
        ElMessage.success(`预约成功！排队号：${res.queueNumber}，当前第${res.position}位，前方${res.aheadCount}人`);
        reserveDialogVisible.value = false;
        fetchBooks();
      } catch (error) {
        ElMessage.error('预约失败');
      } finally {
        reserveSubmitting.value = false;
      }
    }
  });
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitLoading.value = true;
      try {
        if (isEdit.value && form.id) {
          await api.put(`/books/${form.id}`, form);
          ElMessage.success('更新成功');
        } else {
          await api.post('/books', form);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        fetchBooks();
        fetchTagsWithStats();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

onMounted(() => {
  fetchBooks();
  fetchCategories();
  fetchPublishers();
  fetchTags();
  fetchHotTags();
  fetchTagsWithStats();
  fetchBorrowers();
});
</script>

<style scoped lang="scss">
.books-container {
  width: 100%;
}

.content-wrapper {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.sidebar {
  flex-shrink: 0;
  padding: 0;
}

.main-content {
  flex: 1;
  padding: 0;
  min-width: 0;
}

.tag-sidebar {
  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
  }

  .sidebar-title {
    font-weight: 600;
    font-size: 14px;
    color: #303133;
  }

  .tag-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .tag-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    margin-bottom: 4px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f7fa;
    }

    &.active {
      background-color: #ecf5ff;
    }
  }

  .tag-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tag-color-dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .tag-name {
    font-size: 14px;
    color: #303133;
  }

  .tag-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tag-count {
    font-size: 12px;
    color: #909399;
    background-color: #f4f4f5;
    padding: 2px 6px;
    border-radius: 10px;
  }

  .tag-hot {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    color: #e6a23c;
  }

  .empty-tags {
    text-align: center;
    color: #909399;
    font-size: 13px;
    padding: 20px 0;
  }

  .filter-mode {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #ebeef5;
    text-align: center;
  }
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .right {
    display: flex;
    align-items: center;
  }
}

.book-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hot-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #409eff;
    color: #409eff;
  }

  &.selected {
    background-color: #ecf5ff;
    border-color: #409eff;
    color: #409eff;
  }

  .hot-tag-color {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
}

.text-grey {
  color: #909399;
}

.rating-cell {
  display: flex;
  align-items: center;
  gap: 6px;

  .rating-score {
    font-weight: 600;
    color: #e6a23c;
    font-size: 13px;
  }
}
</style>
