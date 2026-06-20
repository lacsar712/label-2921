<template>
  <div class="announcements-container">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>公告管理</span>
          <el-button type="primary" @click="openDialog('create')">
            <el-icon><Plus /></el-icon>
            新建公告
          </el-button>
        </div>
      </template>

      <div class="filter-bar">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="全部" name="all" />
          <el-tab-pane label="草稿" name="DRAFT" />
          <el-tab-pane label="待发布" name="PENDING" />
          <el-tab-pane label="已发布" name="PUBLISHED" />
          <el-tab-pane label="已归档" name="ARCHIVED" />
        </el-tabs>
      </div>

      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索公告标题或摘要"
          clearable
          style="width: 300px"
          @clear="fetchAnnouncements"
          @keyup.enter="fetchAnnouncements"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="fetchAnnouncements">搜索</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="announcements"
        style="width: 100%; margin-top: 16px"
        border
        stripe
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <div class="title-cell">
              <el-tag v-if="row.isPinned" type="danger" size="small" effect="dark">
                置顶
              </el-tag>
              <span class="title-text">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="摘要" min-width="200" show-overflow-tooltip />
        <el-table-column label="发布范围" width="120">
          <template #default="{ row }">
            <el-tag :type="scopeType(row.scope)">{{ scopeLabel(row.scope) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="160">
          <template #default="{ row }">
            {{ row.publishAt ? formatDate(row.publishAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="到期时间" width="160">
          <template #default="{ row }">
            {{ row.expireAt ? formatDate(row.expireAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="创建人" width="120">
          <template #default="{ row }">
            {{ row.createdBy?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewAnnouncement(row)">查看</el-button>
            <el-button link type="primary" @click="openDialog('edit', row)">编辑</el-button>
            <el-dropdown
              v-if="row.status !== 'ARCHIVED'"
              @command="(cmd: string) => handleStatusChange(row, cmd)"
            >
              <el-button link type="primary">
                更多操作
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="row.status === 'DRAFT'"
                    command="PUBLISH"
                  >
                    立即发布
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="row.status === 'DRAFT'"
                    command="PENDING"
                  >
                    提交审核
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="row.status === 'PENDING'"
                    command="PUBLISH"
                  >
                    发布
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="row.status === 'PUBLISHED'"
                    command="ARCHIVE"
                  >
                    归档
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="row.status === 'PUBLISHED' && !row.isPinned"
                    command="PIN"
                  >
                    置顶
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="row.status === 'PUBLISHED' && row.isPinned"
                    command="UNPIN"
                  >
                    取消置顶
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              link
              type="danger"
              v-if="userStore.isAdmin"
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
      :title="dialogMode === 'create' ? '新建公告' : '编辑公告'"
      width="900px"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" maxlength="100" show-word-limit />
        </el-form-item>

        <el-form-item label="摘要" prop="summary">
          <el-input
            v-model="form.summary"
            type="textarea"
            :rows="2"
            placeholder="请输入公告摘要（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="封面图" prop="coverImage">
          <el-input v-model="form.coverImage" placeholder="请输入封面图URL（可选）" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="发布范围" prop="scope">
              <el-select v-model="form.scope" placeholder="请选择发布范围">
                <el-option label="全部人员" value="ALL" />
                <el-option label="仅管理员" value="ADMIN" />
                <el-option label="仅图书管理员" value="LIBRARIAN" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择状态">
                <el-option label="草稿" value="DRAFT" />
                <el-option label="待发布" value="PENDING" />
                <el-option label="已发布" value="PUBLISHED" />
                <el-option label="已归档" value="ARCHIVED" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="置顶权重" prop="pinWeight">
              <el-input-number v-model="form.pinWeight" :min="0" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发布时间" prop="publishAt">
              <el-date-picker
                v-model="form.publishAt"
                type="datetime"
                placeholder="选择定时发布时间（不选则立即）"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="到期时间" prop="expireAt">
              <el-date-picker
                v-model="form.expireAt"
                type="datetime"
                placeholder="选择自动下线时间（不选则永不过期）"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="置顶">
          <el-switch v-model="form.isPinned" />
          <span class="form-tip">置顶公告将在轮播中优先展示</span>
        </el-form-item>

        <el-form-item label="公告内容" prop="content">
          <div class="editor-container">
            <div class="editor-tabs">
              <el-radio-group v-model="editorMode" size="small">
                <el-radio-button value="edit">编辑</el-radio-button>
                <el-radio-button value="preview">预览</el-radio-button>
              </el-radio-group>
            </div>
            <div class="editor-content">
              <textarea
                v-if="editorMode === 'edit'"
                v-model="form.content"
                class="markdown-editor"
                placeholder="支持 Markdown 格式..."
                @input="handleContentInput"
              />
              <div v-else class="markdown-preview" v-html="renderedContent"></div>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="saveAsDraft">存为草稿</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ dialogMode === 'create' ? '创建' : '保存' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="公告详情" width="800px">
      <div v-if="currentAnnouncement" class="announcement-detail">
        <div class="detail-header">
          <h2>{{ currentAnnouncement.title }}</h2>
          <div class="detail-meta">
            <el-tag :type="statusType(currentAnnouncement.status)">
              {{ statusLabel(currentAnnouncement.status) }}
            </el-tag>
            <span class="meta-item">
              <el-icon><User /></el-icon>
              {{ currentAnnouncement.createdBy?.username || '-' }}
            </span>
            <span class="meta-item">
              <el-icon><Clock /></el-icon>
              {{ formatDate(currentAnnouncement.createdAt) }}
            </span>
          </div>
        </div>
        <div v-if="currentAnnouncement.coverImage" class="detail-cover">
          <img :src="currentAnnouncement.coverImage" alt="封面图" />
        </div>
        <div v-if="currentAnnouncement.summary" class="detail-summary">
          {{ currentAnnouncement.summary }}
        </div>
        <div class="detail-content" v-html="renderDetailContent"></div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, ArrowDown, User, Clock } from '@element-plus/icons-vue';
import api from '../api';
import { useUserStore } from '../store/user';
import type { FormInstance, FormRules } from 'element-plus';
import type { Announcement, AnnouncementForm, AnnouncementStatus, AnnouncementScope } from '../types';

const renderMarkdown = (text: string): string => {
  if (!text) return '';

  const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inlineMarkdown = (s: string): string => {
    let r = escapeHtml(s);
    r = r.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    r = r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    r = r.replace(/\*(.+?)\*/g, '<em>$1</em>');
    r = r.replace(/`(.+?)`/g, '<code>$1</code>');
    r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    return r;
  };

  const lines = text.split('\n');
  const htmlParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^(#{1,6})/)?.[1].length ?? 1;
      const content = inlineMarkdown(line.replace(/^#{1,6}\s+/, ''));
      htmlParts.push(`<h${level}>${content}</h${level}>`);
      i++;
    } else if (/^>\s/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      htmlParts.push(`<blockquote>${inlineMarkdown(quoteLines.join('<br>'))}</blockquote>`);
    } else if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^[-*+]\s+/, ''))}</li>`);
        i++;
      }
      htmlParts.push(`<ul>${items.join('')}</ul>`);
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      htmlParts.push(`<ol>${items.join('')}</ol>`);
    } else if (line.trim() === '') {
      i++;
    } else {
      const paraLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^#{1,6}\s/.test(lines[i]) &&
        !/^[-*+]\s/.test(lines[i]) &&
        !/^\d+\.\s/.test(lines[i]) &&
        !/^>\s/.test(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      htmlParts.push(`<p>${inlineMarkdown(paraLines.join('<br>'))}</p>`);
    }
  }

  return htmlParts.join('');
};

const userStore = useUserStore();

const loading = ref(false);
const submitting = ref(false);
const announcements = ref<Announcement[]>([]);
const activeTab = ref('all');
const searchKeyword = ref('');
const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const editingId = ref<number | null>(null);
const detailVisible = ref(false);
const currentAnnouncement = ref<Announcement | null>(null);
const formRef = ref<FormInstance>();
const editorMode = ref<'edit' | 'preview'>('edit');

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});

const form = reactive<AnnouncementForm>({
  title: '',
  summary: '',
  content: '',
  contentType: 'markdown',
  coverImage: '',
  scope: 'ALL',
  status: 'DRAFT',
  isPinned: false,
  pinWeight: 0,
  publishAt: null,
  expireAt: null
});

const rules: FormRules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在2到100个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入公告内容', trigger: 'blur' }
  ],
  scope: [
    { required: true, message: '请选择发布范围', trigger: 'change' }
  ]
};

const renderedContent = computed(() => {
  return renderMarkdown(form.content || '');
});

const renderDetailContent = computed(() => {
  if (!currentAnnouncement.value) return '';
  return renderMarkdown(currentAnnouncement.value.content || '');
});

const statusLabel = (status: AnnouncementStatus): string => {
  const labels: Record<AnnouncementStatus, string> = {
    DRAFT: '草稿',
    PENDING: '待发布',
    PUBLISHED: '已发布',
    ARCHIVED: '已归档'
  };
  return labels[status] || status;
};

const statusType = (status: AnnouncementStatus): string => {
  const types: Record<AnnouncementStatus, string> = {
    DRAFT: 'info',
    PENDING: 'warning',
    PUBLISHED: 'success',
    ARCHIVED: 'info'
  };
  return types[status] || '';
};

const scopeLabel = (scope: AnnouncementScope): string => {
  const labels: Record<AnnouncementScope, string> = {
    ALL: '全部',
    ADMIN: '管理员',
    LIBRARIAN: '图书管理员'
  };
  return labels[scope] || scope;
};

const scopeType = (scope: AnnouncementScope): string => {
  const types: Record<AnnouncementScope, string> = {
    ALL: '',
    ADMIN: 'danger',
    LIBRARIAN: 'warning'
  };
  return types[scope] || '';
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

const fetchAnnouncements = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    };

    if (activeTab.value !== 'all') {
      params.status = activeTab.value;
    }

    if (searchKeyword.value) {
      params.keyword = searchKeyword.value;
    }

    const res: any = await api.get('/announcements', { params });
    announcements.value = res.data;
    pagination.total = res.total;
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
  } finally {
    loading.value = false;
  }
};

const handleTabChange = () => {
  pagination.page = 1;
  fetchAnnouncements();
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  pagination.page = 1;
  fetchAnnouncements();
};

const handleCurrentChange = (page: number) => {
  pagination.page = page;
  fetchAnnouncements();
};

const openDialog = (mode: 'create' | 'edit', announcement?: Announcement) => {
  dialogMode.value = mode;
  if (mode === 'edit' && announcement) {
    editingId.value = announcement.id;
    Object.assign(form, {
      title: announcement.title,
      summary: announcement.summary || '',
      content: announcement.content,
      contentType: announcement.contentType || 'markdown',
      coverImage: announcement.coverImage || '',
      scope: announcement.scope,
      status: announcement.status,
      isPinned: announcement.isPinned,
      pinWeight: announcement.pinWeight,
      publishAt: announcement.publishAt || null,
      expireAt: announcement.expireAt || null
    });
  } else {
    editingId.value = null;
    resetForm();
  }
  dialogVisible.value = true;
  editorMode.value = 'edit';
};

const resetForm = () => {
  formRef.value?.resetFields();
  Object.assign(form, {
    title: '',
    summary: '',
    content: '',
    contentType: 'markdown',
    coverImage: '',
    scope: 'ALL',
    status: 'DRAFT',
    isPinned: false,
    pinWeight: 0,
    publishAt: null,
    expireAt: null
  });
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      if (dialogMode.value === 'create') {
        await api.post('/announcements', form);
        ElMessage.success('创建成功');
      } else if (editingId.value) {
        await api.put(`/announcements/${editingId.value}`, form);
        ElMessage.success('更新成功');
      }
      dialogVisible.value = false;
      fetchAnnouncements();
    } catch (error) {
      ElMessage.error(dialogMode.value === 'create' ? '创建失败' : '更新失败');
    } finally {
      submitting.value = false;
    }
  });
};

const saveAsDraft = async () => {
  if (!form.title) {
    ElMessage.warning('请输入公告标题');
    return;
  }

  const draftForm = { ...form, status: 'DRAFT' as const };
  submitting.value = true;
  try {
    if (dialogMode.value === 'create') {
      await api.post('/announcements', draftForm);
      ElMessage.success('已保存为草稿');
    } else if (editingId.value) {
      await api.put(`/announcements/${editingId.value}`, draftForm);
      ElMessage.success('已保存为草稿');
    }
    dialogVisible.value = false;
    fetchAnnouncements();
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    submitting.value = false;
  }
};

const handleStatusChange = async (announcement: Announcement, command: string) => {
  try {
    if (command === 'PUBLISH') {
      await ElMessageBox.confirm(
        `确定要发布公告 "${announcement.title}" 吗？`,
        '确认发布',
        { type: 'warning' }
      );
      await api.post(`/announcements/${announcement.id}/publish`);
      ElMessage.success('发布成功');
    } else if (command === 'ARCHIVE') {
      await ElMessageBox.confirm(
        `确定要归档公告 "${announcement.title}" 吗？`,
        '确认归档',
        { type: 'warning' }
      );
      await api.post(`/announcements/${announcement.id}/archive`);
      ElMessage.success('归档成功');
    } else if (command === 'PIN') {
      await api.put(`/announcements/${announcement.id}`, { isPinned: true });
      ElMessage.success('已置顶');
    } else if (command === 'UNPIN') {
      await api.put(`/announcements/${announcement.id}`, { isPinned: false });
      ElMessage.success('已取消置顶');
    } else if (command === 'PENDING') {
      await api.patch(`/announcements/${announcement.id}/status`, { status: 'PENDING' });
      ElMessage.success('已提交审核');
    }
    fetchAnnouncements();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
};

const handleDelete = async (announcement: Announcement) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除公告 "${announcement.title}" 吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    );

    await api.delete(`/announcements/${announcement.id}`);
    ElMessage.success('删除成功');
    fetchAnnouncements();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const viewAnnouncement = (announcement: Announcement) => {
  currentAnnouncement.value = announcement;
  detailVisible.value = true;
};

const handleContentInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  form.content = target.value;
};

onMounted(() => {
  fetchAnnouncements();
});
</script>

<style scoped lang="scss">
.announcements-container {
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
    gap: 12px;
    align-items: center;
  }

  .title-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .title-text {
      font-weight: 500;
    }
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-left: 8px;
  }

  .editor-container {
    width: 100%;
    border: 1px solid #dcdfe6;
    border-radius: 4px;

    .editor-tabs {
      padding: 8px;
      background: #f5f7fa;
      border-bottom: 1px solid #dcdfe6;
    }

    .editor-content {
      min-height: 300px;

      .markdown-editor {
        width: 100%;
        min-height: 300px;
        padding: 12px;
        border: none;
        outline: none;
        resize: vertical;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 14px;
        line-height: 1.6;
      }

      .markdown-preview {
        padding: 16px;
        line-height: 1.8;

        h1, h2, h3, h4, h5, h6 {
          margin-top: 16px;
          margin-bottom: 8px;
        }

        h1 { font-size: 24px; }
        h2 { font-size: 20px; }
        h3 { font-size: 18px; }

        p { margin: 8px 0; }

        ul, ol {
          padding-left: 24px;
          margin: 8px 0;
        }

        code {
          background: #f5f7fa;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
        }

        pre {
          background: #f5f7fa;
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;

          code {
            background: transparent;
            padding: 0;
          }
        }

        blockquote {
          border-left: 4px solid #409eff;
          padding-left: 16px;
          color: #606266;
          margin: 8px 0;
        }
      }
    }
  }

  .announcement-detail {
    .detail-header {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #ebeef5;

      h2 {
        margin: 0 0 12px 0;
        font-size: 22px;
        color: #303133;
      }

      .detail-meta {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #909399;

          .el-icon {
            font-size: 14px;
          }
        }
      }
    }

    .detail-cover {
      margin-bottom: 16px;

      img {
        width: 100%;
        max-height: 300px;
        object-fit: cover;
        border-radius: 8px;
      }
    }

    .detail-summary {
      padding: 12px 16px;
      background: #f5f7fa;
      border-radius: 4px;
      margin-bottom: 16px;
      color: #606266;
      line-height: 1.6;
    }

    .detail-content {
      line-height: 1.8;
      color: #303133;

      h1, h2, h3, h4, h5, h6 {
        margin-top: 20px;
        margin-bottom: 10px;
      }

      h1 { font-size: 24px; }
      h2 { font-size: 20px; }
      h3 { font-size: 18px; }

      p { margin: 10px 0; }

      ul, ol {
        padding-left: 24px;
        margin: 10px 0;
      }

      img {
        max-width: 100%;
        border-radius: 4px;
      }

      code {
        background: #f5f7fa;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 13px;
      }

      pre {
        background: #f5f7fa;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;

        code {
          background: transparent;
          padding: 0;
        }
      }

      blockquote {
        border-left: 4px solid #409eff;
        padding-left: 16px;
        color: #606266;
        margin: 12px 0;
      }
    }
  }
}
</style>
