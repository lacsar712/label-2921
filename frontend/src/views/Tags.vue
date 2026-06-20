<template>
  <div class="tags-container">
    <el-card shadow="hover">
      <div class="header-actions">
        <span style="font-size: 16px; font-weight: 600; color: #303133;">标签管理</span>
        <div class="header-right">
          <el-button
            v-if="userStore.isLibrarian"
            type="warning"
            :icon="Promotion"
            @click="handleMerge"
            :disabled="selectedTags.length < 2"
          >
            合并标签 ({{ selectedTags.length }})
          </el-button>
          <el-button
            v-if="userStore.isLibrarian"
            type="primary"
            :icon="Plus"
            @click="handleAdd"
          >
            新增标签
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="tags"
        style="width: 100%; margin-top: 20px"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column
          type="selection"
          width="55"
          align="center"
        />
        <el-table-column
          prop="id"
          label="ID"
          width="80"
          align="center"
        />
        <el-table-column
          label="标签名称"
          min-width="150"
        >
          <template #default="{ row }">
            <el-tag :color="row.color" effect="dark">
              {{ row.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="颜色"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <div class="color-preview">
              <span
                class="color-dot"
                :style="{ backgroundColor: row.color }"
              />
              <span class="color-value">{{ row.color }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="description"
          label="描述"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          prop="sortOrder"
          label="排序"
          width="80"
          align="center"
        />
        <el-table-column
          label="关联图书"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="info">{{ row._count?.bookTags ?? 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="200"
          align="center"
          fixed="right"
        >
          <template #default="{ row }">
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

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑标签' : '新增标签'"
      width="450px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item
          label="名称"
          prop="name"
        >
          <el-input v-model="form.name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item
          label="颜色"
          prop="color"
        >
          <div class="color-picker-row">
            <el-color-picker
              v-model="form.color"
              show-alpha
            />
            <el-input
              v-model="form.color"
              placeholder="#409eff"
              style="margin-left: 10px; flex: 1"
            />
          </div>
        </el-form-item>
        <el-form-item
          label="描述"
          prop="description"
        >
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入标签描述"
          />
        </el-form-item>
        <el-form-item
          label="排序"
          prop="sortOrder"
        >
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
            style="width: 100%"
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
      v-model="mergeDialogVisible"
      title="合并标签"
      width="500px"
    >
      <div class="merge-info">
        <p>将合并以下 <strong>{{ selectedTags.length }}</strong> 个标签：</p>
        <div class="merge-tags">
          <el-tag
            v-for="tag in selectedTags"
            :key="tag.id"
            :color="tag.color"
            effect="dark"
            style="margin-right: 8px; margin-bottom: 8px"
          >
            {{ tag.name }}
          </el-tag>
        </div>
        <el-form
          :model="mergeForm"
          :rules="mergeRules"
          label-width="100px"
          style="margin-top: 20px"
        >
          <el-form-item
            label="目标标签"
            prop="targetTagId"
          >
            <el-select
              v-model="mergeForm.targetTagId"
              placeholder="请选择保留的目标标签"
              style="width: 100%"
            >
              <el-option
                v-for="tag in selectedTags"
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
        </el-form>
        <div v-if="mergePreview" class="merge-preview">
          <el-alert
            :title="`将影响 ${mergePreview.affectedBookCount} 本图书`"
            type="warning"
            show-icon
          >
            <template #default>
              <div v-if="mergePreview.affectedBooks.length > 0" class="affected-books">
                <div
                  v-for="book in mergePreview.affectedBooks.slice(0, 5)"
                  :key="book.id"
                  class="affected-book-item"
                >
                  {{ book.title }} ({{ book.isbn }})
                </div>
                <div v-if="mergePreview.affectedBooks.length > 5" class="more-books">
                  还有 {{ mergePreview.affectedBooks.length - 5 }} 本图书...
                </div>
              </div>
            </template>
          </el-alert>
        </div>
      </div>
      <template #footer>
        <el-button @click="mergeDialogVisible = false">
          取消
        </el-button>
        <el-button
          type="warning"
          :loading="mergeLoading"
          @click="submitMerge"
          :disabled="!mergeForm.targetTagId"
        >
          确认合并
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue';
import { Plus, Promotion } from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance } from 'element-plus';
import type { Tag } from '../types';

const userStore = useUserStore();
const tags = ref<Tag[]>([]);
const selectedTags = ref<Tag[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const submitLoading = ref(false);
const formRef = ref<FormInstance | null>(null);
const isEdit = ref(false);
const editId = ref<number | null>(null);

const mergeDialogVisible = ref(false);
const mergeLoading = ref(false);
const mergePreview = ref<any>(null);
const mergeForm = reactive({
  targetTagId: undefined as number | undefined,
});
const mergeRules = {
  targetTagId: [{ required: true, message: '请选择目标标签', trigger: 'change' }],
};

const form = reactive({
  name: '',
  color: '#409eff',
  description: '',
  sortOrder: 0,
});

const rules = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }],
  color: [{ required: true, message: '请选择标签颜色', trigger: 'change' }],
  sortOrder: [{ required: true, message: '请输入排序值', trigger: 'blur' }],
};

const fetchTags = async () => {
  loading.value = true;
  try {
    const res: any = await api.get('/tags');
    tags.value = res;
  } finally {
    loading.value = false;
  }
};

const handleSelectionChange = (selection: any[]) => {
  selectedTags.value = selection;
};

const handleAdd = () => {
  isEdit.value = false;
  editId.value = null;
  Object.assign(form, { name: '', color: '#409eff', description: '', sortOrder: 0 });
  dialogVisible.value = true;
};

const handleEdit = (row: Tag) => {
  isEdit.value = true;
  editId.value = row.id;
  Object.assign(form, {
    name: row.name,
    color: row.color,
    description: row.description || '',
    sortOrder: row.sortOrder,
  });
  dialogVisible.value = true;
};

const handleDelete = (row: Tag) => {
  ElMessageBox.confirm(
    `确定要删除标签"${row.name}"吗？相关图书将失去此标签。`,
    '警告',
    { type: 'warning' }
  ).then(async () => {
    try {
      await api.delete(`/tags/${row.id}`);
      ElMessage.success('删除成功');
      fetchTags();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitLoading.value = true;
      try {
        if (isEdit.value && editId.value) {
          await api.put(`/tags/${editId.value}`, form);
          ElMessage.success('更新成功');
        } else {
          await api.post('/tags', form);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        fetchTags();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const handleMerge = () => {
  mergeForm.targetTagId = undefined;
  mergePreview.value = null;
  mergeDialogVisible.value = true;
};

watch(
  () => mergeForm.targetTagId,
  async (newVal) => {
    if (newVal && selectedTags.value.length >= 2) {
      const sourceIds = selectedTags.value
        .filter((t) => t.id !== newVal)
        .map((t) => t.id);
      if (sourceIds.length >= 1) {
        try {
          const res: any = await api.post('/tags/merge/preview', {
            sourceTagIds: sourceIds,
          });
          mergePreview.value = res;
        } catch (error) {
          mergePreview.value = null;
        }
      } else {
        mergePreview.value = null;
      }
    } else {
      mergePreview.value = null;
    }
  }
);

const submitMerge = async () => {
  if (!mergeForm.targetTagId) return;
  const sourceIds = selectedTags.value
    .filter((t) => t.id !== mergeForm.targetTagId)
    .map((t) => t.id);

  if (sourceIds.length < 1) {
    ElMessage.warning('请选择至少1个源标签进行合并');
    return;
  }

  mergeLoading.value = true;
  try {
    await api.post('/tags/merge', {
      sourceTagIds: sourceIds,
      targetTagId: mergeForm.targetTagId,
    });
    ElMessage.success('合并成功');
    mergeDialogVisible.value = false;
    selectedTags.value = [];
    fetchTags();
  } catch (error) {
    ElMessage.error('合并失败');
  } finally {
    mergeLoading.value = false;
  }
};

onMounted(fetchTags);
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-right {
    display: flex;
    gap: 10px;
  }
}

.color-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.color-dot {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
}

.color-value {
  font-size: 12px;
  color: #606266;
  font-family: monospace;
}

.color-picker-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.merge-info {
  .merge-tags {
    margin-top: 10px;
  }
}

.merge-preview {
  margin-top: 20px;

  .affected-books {
    margin-top: 10px;
  }

  .affected-book-item {
    font-size: 13px;
    color: #606266;
    padding: 4px 0;
  }

  .more-books {
    font-size: 12px;
    color: #909399;
    margin-top: 8px;
  }
}
</style>
