<template>
  <div v-if="announcements.length > 0" class="announcement-carousel">
    <el-carousel
      ref="carouselRef"
      :interval="5000"
      :autoplay="announcements.length > 1"
      height="auto"
      indicator-position="right"
      arrow="hover"
    >
      <el-carousel-item v-for="item in announcements" :key="item.id">
        <div
          class="carousel-item"
          @click="handleViewDetail(item)"
        >
          <div class="item-content">
            <div class="item-header">
              <el-tag
                v-if="item.isPinned"
                type="danger"
                effect="dark"
                size="small"
              >
                置顶
              </el-tag>
              <span class="item-title">{{ item.title }}</span>
            </div>
            <p v-if="item.summary" class="item-summary">
              {{ item.summary }}
            </p>
            <div class="item-footer">
              <span class="item-time">
                <el-icon><Clock /></el-icon>
                {{ formatDate(item.publishAt || item.createdAt) }}
              </span>
              <span class="view-more">
                查看详情
                <el-icon><ArrowRight /></el-icon>
              </span>
            </div>
          </div>
        </div>
      </el-carousel-item>
    </el-carousel>
  </div>

  <el-dialog
    v-model="detailVisible"
    :title="currentAnnouncement?.title"
    width="700px"
  >
    <div v-if="currentAnnouncement" class="announcement-detail">
      <div class="detail-meta">
        <el-tag type="success">已发布</el-tag>
        <span class="meta-item">
          <el-icon><User /></el-icon>
          {{ currentAnnouncement.createdBy?.username || '-' }}
        </span>
        <span class="meta-item">
          <el-icon><Clock /></el-icon>
          {{ formatDate(currentAnnouncement.publishAt || currentAnnouncement.createdAt) }}
        </span>
      </div>
      <div
        v-if="currentAnnouncement.coverImage"
        class="detail-cover"
      >
        <img :src="currentAnnouncement.coverImage" alt="封面图" />
      </div>
      <div
        v-if="currentAnnouncement.summary"
        class="detail-summary"
      >
        {{ currentAnnouncement.summary }}
      </div>
      <div class="detail-content" v-html="renderedContent"></div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Clock, ArrowRight, User } from '@element-plus/icons-vue';
import api from '../api';
import type { Announcement } from '../types';

const announcements = ref<Announcement[]>([]);
const detailVisible = ref(false);
const currentAnnouncement = ref<Announcement | null>(null);

const renderMarkdown = (text: string): string => {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  html = html.replace(/\*\*\*(.*)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');

  html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

  html = html.replace(
    /\[([^\]]+)\]\(([^\)]+)\)/gim,
    '<a href="$2" target="_blank">$1</a>'
  );

  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  html = html.replace(/\n\n/gim, '</p><p>');
  html = html.replace(/\n/gim, '<br>');
  html = '<p>' + html + '</p>';

  return html;
};

const renderedContent = computed(() => {
  if (!currentAnnouncement.value) return '';
  return renderMarkdown(currentAnnouncement.value.content || '');
});

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const fetchActiveAnnouncements = async () => {
  try {
    const res: any = await api.get('/announcements/active');
    announcements.value = res;
  } catch (error) {
    console.error('Failed to fetch active announcements:', error);
  }
};

const handleViewDetail = (announcement: Announcement) => {
  currentAnnouncement.value = announcement;
  detailVisible.value = true;
};

onMounted(() => {
  fetchActiveAnnouncements();
});
</script>

<style scoped lang="scss">
.announcement-carousel {
  margin-bottom: 20px;

  :deep(.el-carousel__item) {
    height: auto;
    min-height: 80px;
  }

  :deep(.el-carousel__indicators) {
    right: 20px;
  }

  .carousel-item {
    cursor: pointer;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    padding: 16px 24px;
    color: #fff;
    transition: transform 0.3s;

    &:hover {
      transform: translateY(-2px);
    }

    .item-content {
      .item-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;

        .item-title {
          font-size: 18px;
          font-weight: 600;
          line-height: 1.4;
        }
      }

      .item-summary {
        font-size: 14px;
        opacity: 0.9;
        margin: 0 0 12px 0;
        line-height: 1.6;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .item-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        opacity: 0.85;

        .item-time {
          display: flex;
          align-items: center;
          gap: 4px;

          .el-icon {
            font-size: 14px;
          }
        }

        .view-more {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;

          .el-icon {
            font-size: 14px;
          }
        }
      }
    }
  }
}

.announcement-detail {
  .detail-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;

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

  .detail-cover {
    margin-bottom: 16px;

    img {
      width: 100%;
      max-height: 250px;
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

    h1 { font-size: 22px; }
    h2 { font-size: 18px; }
    h3 { font-size: 16px; }

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
</style>
