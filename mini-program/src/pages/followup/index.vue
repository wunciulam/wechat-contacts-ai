<template>
  <view class="followup-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        class="search-input"
        type="text"
        v-model="searchTerm"
        placeholder="搜索跟进记录..."
        @input="onSearch"
      />
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view
        class="filter-item"
        :class="{ active: filter === 'all' }"
        @click="filter = 'all'"
      >
        <text>全部</text>
      </view>
      <view
        class="filter-item"
        :class="{ active: filter === 'pending' }"
        @click="filter = 'pending'"
      >
        <text>待跟进</text>
        <text class="badge" v-if="pendingCount > 0">{{ pendingCount }}</text>
      </view>
      <view
        class="filter-item"
        :class="{ active: filter === 'completed' }"
        @click="filter = 'completed'"
      >
        <text>已完成</text>
      </view>
    </view>

    <!-- 跟进记录列表 -->
    <scroll-view class="record-list" scroll-y>
      <view class="timeline">
        <view
          v-for="group in groupedRecords"
          :key="group.date"
          class="timeline-group"
        >
          <view class="timeline-date">
            <text class="date-text">{{ group.date }}</text>
            <text class="date-count">{{ group.records.length }} 条记录</text>
          </view>

          <view
            v-for="record in group.records"
            :key="record.id"
            class="timeline-item"
            @click="goToContact(record.contactId)"
          >
            <view class="timeline-dot" :class="{ completed: record.completed }"></view>
            <view class="timeline-content">
              <view class="record-header">
                <text class="contact-name">{{ record.contactName }}</text>
                <text class="record-time">{{ record.time }}</text>
              </view>
              <view class="record-body">
                <text class="record-content">{{ record.content }}</text>
              </view>
              <view class="record-footer">
                <view class="status-badge" :class="record.completed ? 'completed' : 'pending'">
                  <text>{{ record.completed ? '已完成' : '待跟进' }}</text>
                </view>
                <view class="actions">
                  <button
                    class="action-btn"
                    :class="{ active: record.completed }"
                    @click.stop="toggleComplete(record)"
                  >
                    <text>{{ record.completed ? '✓' : '○' }}</text>
                  </button>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="groupedRecords.length === 0">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无跟进记录</text>
        <button class="add-btn" @click="goToAdd">添加跟进</button>
      </view>
    </scroll-view>

    <!-- 底部添加按钮 -->
    <view class="fab-button" @click="goToAdd">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useContactsStore } from '../../stores/contacts';
import { Contact, ProgressRecord } from '../../types';

interface RecordWithContact extends ProgressRecord {
  contactId: string;
  contactName: string;
}

const store = useContactsStore();
const searchTerm = ref('');
const filter = ref<'all' | 'pending' | 'completed'>('all');

// 获取所有跟进记录
const allRecords = computed(() => {
  const records: RecordWithContact[] = [];
  store.contacts.forEach(contact => {
    if (contact.progressHistory) {
      contact.progressHistory.forEach(record => {
        records.push({
          ...record,
          contactId: contact.id,
          contactName: contact.remarkName || contact.nickname || '未命名'
        });
      });
    }
  });
  // 按日期倒序
  return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

// 筛选后的记录
const filteredRecords = computed(() => {
  let result = allRecords.value;

  // 搜索筛选
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter(r =>
      r.content.toLowerCase().includes(term) ||
      r.contactName.toLowerCase().includes(term)
    );
  }

  // 状态筛选
  if (filter.value === 'pending') {
    result = result.filter(r => !r.completed);
  } else if (filter.value === 'completed') {
    result = result.filter(r => r.completed);
  }

  return result;
});

// 待跟进数量
const pendingCount = computed(() => {
  return allRecords.value.filter(r => !r.completed).length;
});

// 按日期分组
const groupedRecords = computed(() => {
  const groups: { date: string; records: RecordWithContact[] }[] = [];
  const map = new Map<string, RecordWithContact[]>();

  filteredRecords.value.forEach(record => {
    const date = record.date;
    if (!map.has(date)) {
      map.set(date, []);
    }
    map.get(date)!.push(record);
  });

  map.forEach((records, date) => {
    groups.push({ date, records });
  });

  return groups;
});

const onSearch = () => {
  // 搜索逻辑在 computed 中处理
};

const toggleComplete = (record: RecordWithContact) => {
  store.updateProgress(record.contactId, record.id, {
    completed: !record.completed
  });
};

const goToContact = (contactId: string) => {
  uni.navigateTo({
    url: `/pages/contact-detail/index?id=${contactId}`
  });
};

const goToAdd = () => {
  uni.navigateTo({
    url: '/pages/contact-detail/index?mode=add-followup'
  });
};
</script>

<style scoped>
.followup-page {
  height: 100vh;
  background-color: #f5f5f5;
}

.search-bar {
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background-color: #f5f5f5;
  border-radius: 20px;
  font-size: 14px;
}

.filter-bar {
  display: flex;
  padding: 12px 16px;
  background-color: #fff;
  gap: 12px;
  border-bottom: 1px solid #eee;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background-color: #f5f5f5;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
}

.filter-item.active {
  background-color: #333;
  color: #fff;
}

.badge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  background-color: #ff4d4f;
  border-radius: 9px;
  font-size: 11px;
  color: #fff;
  text-align: center;
  line-height: 18px;
}

.record-list {
  height: calc(100vh - 180px);
  padding: 16px;
}

.timeline {
  position: relative;
}

.timeline-group {
  margin-bottom: 20px;
}

.timeline-date {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-left: 8px;
}

.date-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.date-count {
  font-size: 12px;
  color: #999;
}

.timeline-item {
  display: flex;
  margin-bottom: 16px;
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  position: relative;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ffa940;
  margin-right: 12px;
  margin-top: 4px;
  flex-shrink: 0;
}

.timeline-dot.completed {
  background-color: #52c41a;
}

.timeline-content {
  flex: 1;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.contact-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.record-time {
  font-size: 12px;
  color: #999;
}

.record-body {
  margin-bottom: 12px;
}

.record-content {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.record-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.status-badge.pending {
  background-color: #fff7e6;
  color: #ffa940;
}

.status-badge.completed {
  background-color: #f6ffed;
  color: #52c41a;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.action-btn.active {
  background-color: #52c41a;
  color: #fff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #999;
  margin-bottom: 20px;
}

.add-btn {
  padding: 12px 32px;
  background-color: #333;
  color: #fff;
  border-radius: 24px;
  font-size: 14px;
}

.fab-button {
  position: fixed;
  right: 20px;
  bottom: 100px;
  width: 56px;
  height: 56px;
  background-color: #333;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.fab-icon {
  font-size: 28px;
  color: #fff;
}
</style>
