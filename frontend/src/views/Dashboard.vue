<template>
  <div class="dashboard">
    <AnnouncementCarousel />

    <el-row :gutter="20">
      <el-col
        v-for="(val, key) in summaryMap"
        :key="key"
        :xs="24"
        :sm="12"
        :lg="6"
        class="mb-20"
      >
        <el-card
          shadow="hover"
          class="stat-card"
          body-style="display: flex; align-items: center; justify-content: space-between; padding: 20px;"
        >
          <div class="stat-content">
            <div class="stat-label">
              {{ val.label }}
            </div>
            <div class="stat-value">
              {{ summary[key] || 0 }}
            </div>
          </div>
          <el-icon
            class="stat-icon"
            :style="{ color: val.color }"
          >
            <component :is="val.icon" />
          </el-icon>
        </el-card>
      </el-col>
    </el-row>

    <el-row
      :gutter="20"
      class="mt-20"
    >
      <el-col
        :xs="24"
        :lg="16"
        class="mb-20"
      >
        <el-card
          shadow="hover"
          header="借阅趋势 (最近7天)"
        >
          <div
            ref="trendChart"
            style="height: 350px"
          />
        </el-card>
      </el-col>
      <el-col
        :xs="24"
        :lg="8"
        class="mb-20"
      >
        <el-card
          shadow="hover"
          header="图书分类占比"
        >
          <div
            ref="categoryChart"
            style="height: 350px"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-row
      :gutter="20"
      class="mt-20"
    >
      <el-col :span="24">
        <el-card
          shadow="hover"
          header="库存预警 (库存少于5本)"
        >
          <el-table
            :data="lowStockBooks"
            style="width: 100%"
          >
            <el-table-column
              prop="title"
              label="书名"
            />
            <el-table-column
              prop="author"
              label="作者"
            />
            <el-table-column
              prop="category.name"
              label="分类"
            />
            <el-table-column
              prop="stock"
              label="当前库存"
            >
              <template #default="{ row }">
                <el-tag type="danger">
                  {{ row.stock }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import api from '../api';
import { Notebook, User, Switch, Collection } from '@element-plus/icons-vue';
import AnnouncementCarousel from '../components/AnnouncementCarousel.vue';

const summary = ref<any>({});
const lowStockBooks = ref<any[]>([]);
const trendChart = ref<HTMLElement | null>(null);
const categoryChart = ref<HTMLElement | null>(null);
let trendInstance: echarts.ECharts | null = null;
let categoryInstance: echarts.ECharts | null = null;

const summaryMap = {
  bookCount: { label: '总图书量', icon: Notebook, color: '#409eff' },
  userCount: { label: '总用户数', icon: User, color: '#67c23a' },
  borrowCount: { label: '当前借出', icon: Switch, color: '#e6a23c' },
  categoryCount: { label: '分类总数', icon: Collection, color: '#f56c6c' }
};

const fetchData = async () => {
  try {
    const data: any = await api.get('/stats/dashboard');
    summary.value = data.summary;
    lowStockBooks.value = data.lowStockBooks;
    initTrendChart(data.trends);
    initCategoryChart(data.categories);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }
};

const initTrendChart = (trends: any[]) => {
  if (!trendChart.value) return;
  trendInstance = echarts.init(trendChart.value);
  trendInstance.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: trends.map(t => t.date) },
    yAxis: { type: 'value' },
    series: [{
      data: trends.map(t => t.count),
      type: 'line',
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.5)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
        ])
      },
      lineStyle: { color: '#409eff' }
    }]
  });
};

const initCategoryChart = (categories: any[]) => {
  if (!categoryChart.value) return;
  categoryInstance = echarts.init(categoryChart.value);
  categoryInstance.setOption({
    tooltip: { trigger: 'item' },
    legend: { 
      bottom: '0', 
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12 }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
      data: categories.map(c => ({ value: c.count, name: c.name }))
    }]
  });
};

const handleResize = () => {
  trendInstance?.resize();
  categoryInstance?.resize();
};

onMounted(() => {
  fetchData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped lang="scss">
.mt-20 { margin-top: 20px; }

  .stat-card {
    .stat-content {
      .stat-label { font-size: 14px; color: #909399; margin-bottom: 8px; }
      .stat-value { font-size: 24px; font-weight: bold; color: #303133; }
    }

    .stat-icon {
      font-size: 40px;
      opacity: 0.8;
    }
  }
</style>
