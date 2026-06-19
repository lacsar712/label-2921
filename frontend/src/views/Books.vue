<template>
  <div class="books-container">
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
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="author"
          label="作者"
          width="120"
        />
        <el-table-column
          prop="isbn"
          label="ISBN"
          width="140"
        />
        <el-table-column
          prop="category.name"
          label="分类"
          width="120"
        />
        <el-table-column
          prop="price"
          label="价格"
          width="100"
        >
          <template #default="{ row }">
            ¥{{ row.price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="stock"
          label="库存"
          width="100"
        >
          <template #default="{ row }">
            <el-tag :type="row.stock > 0 ? 'success' : 'danger'">
              {{ row.stock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="在借数量"
          width="100"
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
          width="240"
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

    <!-- Book Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
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

    <!-- 借阅对话框 -->
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

    <!-- 归还对话框 -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { Search, Plus } from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';

const userStore = useUserStore();
const books = ref<any[]>([]);
const categories = ref<any[]>([]);
const borrowers = ref<any[]>([]);
const loading = ref(false);
const search = ref('');
const filterCategory = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('添加图书');
const submitLoading = ref(false);
const formRef = ref<FormInstance | null>(null);
const isEdit = ref(false);

// 借阅对话框相关
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

// 归还对话框相关
const returnDialogVisible = ref(false);
const returnSubmitting = ref(false);
const returnForm = reactive({
  bookId: undefined as number | undefined,
  bookTitle: '',
  borrowId: undefined as number | undefined
});
const bookBorrowRecords = ref<any[]>([]);

const form = reactive({
  id: undefined,
  title: '',
  author: '',
  isbn: '',
  categoryId: undefined,
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
    const res: any = await api.get('/books', {
      params: { search: search.value, categoryId: filterCategory.value }
    });
    // 获取每本书的在借数量
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

const handleAdd = () => {
  isEdit.value = false;
  dialogTitle.value = '添加图书';
  Object.assign(form, { id: undefined, title: '', author: '', isbn: '', categoryId: undefined, price: 0, stock: 0, description: '' });
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  dialogTitle.value = '编辑图书';
  Object.assign(form, {
    id: row.id,
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    categoryId: row.categoryId,
    price: row.price,
    stock: row.stock,
    description: row.description
  });
  dialogVisible.value = true;
};

const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定要删除这本书吗？', '警告', { type: 'warning' }).then(async () => {
    await api.delete(`/books/${row.id}`);
    ElMessage.success('删除成功');
    fetchBooks();
  });
};

const fetchBorrowers = async () => {
  try {
    const res: any = await api.get('/borrowers');
    borrowers.value = res;
  } catch (error) {
    console.error('Failed to fetch borrowers:', error);
  }
};

const handleBorrow = (row: any) => {
  borrowForm.bookId = row.id;
  borrowForm.bookTitle = row.title;
  borrowForm.borrowerId = undefined;
  borrowDialogVisible.value = true;
};

const handleReturn = async (row: any) => {
  returnForm.bookId = row.id;
  returnForm.bookTitle = row.title;
  returnForm.borrowId = undefined;
  returnDialogVisible.value = true;
  // 获取该图书的未归还借阅记录
  try {
    const res: any = await api.get(`/books/${row.id}/current-borrows`);
    bookBorrowRecords.value = res;
  } catch (error) {
    bookBorrowRecords.value = [];
  }
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
    fetchBooks();
  } catch (error) {
    ElMessage.error('归还失败');
  } finally {
    returnSubmitting.value = false;
  }
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
      } catch (error) {
        ElMessage.error('借阅失败');
      } finally {
        borrowSubmitting.value = false;
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
        if (isEdit.value) {
          await api.put(`/books/${form.id}`, form);
          ElMessage.success('更新成功');
        } else {
          await api.post('/books', form);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        fetchBooks();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

onMounted(() => {
  fetchBooks();
  fetchCategories();
  fetchBorrowers();
});
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
