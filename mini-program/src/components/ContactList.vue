<template>
  <view class="contact-list">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        class="search-input"
        type="text"
        v-model="searchTerm"
        placeholder="搜索客户姓名、备注、手机号..."
        @input="onSearch"
      />
      <text class="search-icon">🔍</text>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar" v-if="allTags.length > 0">
      <scroll-view class="tag-scroll" scroll-x>
        <view class="tag-list">
          <view
            class="tag-item"
            :class="{ active: selectedTags.size === 0 }"
            @click="clearTags"
          >
            <text>全部</text>
          </view>
          <view
            v-for="tag in allTags"
            :key="tag"
            class="tag-item"
            :class="{ active: selectedTags.has(tag) }"
            @click="toggleTag(tag)"
          >
            <text>{{ tag }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 跟进状态筛选 -->
    <view class="status-filter">
      <view
        class="status-item"
        :class="{ active: followUpFilter === null }"
        @click="setFollowUpFilter(null)"
      >
        <text>全部</text>
      </view>
      <view
        class="status-item"
        :class="{ active: followUpFilter === 'following' }"
        @click="setFollowUpFilter('following')"
      >
        <text>跟进中</text>
        <text class="badge" v-if="followingCount > 0">{{ followingCount }}</text>
      </view>
      <view
        class="status-item"
        :class="{ active: followUpFilter === 'contacted' }"
        @click="setFollowUpFilter('contacted')"
      >
        <text>已沟通</text>
      </view>
      <view
        class="status-item"
        :class="{ active: followUpFilter === 'idle' }"
        @click="setFollowUpFilter('idle')"
      >
        <text>暂未跟进</text>
      </view>
    </view>

    <!-- 批量操作栏 -->
    <view class="batch-bar" v-if="selectedContactIds.size > 0">
      <text class="batch-info">已选择 {{ selectedContactIds.size }} 位客户</text>
      <view class="batch-actions">
        <button class="batch-btn" @click="showBatchTagModal('add')">批量加标签</button>
        <button class="batch-btn" @click="showBatchTagModal('remove')">批量删标签</button>
        <button class="batch-btn danger" @click="confirmBatchDelete">批量删除</button>
      </view>
    </view>

    <!-- 客户列表 -->
    <scroll-view class="contact-scroll" scroll-y @scrolltolower="loadMore">
      <view class="contact-grid">
        <view
          v-for="contact in displayContacts"
          :key="contact.id"
          class="contact-card"
          @click="goToDetail(contact)"
        >
          <!-- 选择框 -->
          <view class="select-box" @click.stop="toggleSelect(contact.id)">
            <view class="checkbox" :class="{ checked: selectedContactIds.has(contact.id) }">
              <text v-if="selectedContactIds.has(contact.id)">✓</text>
            </view>
          </view>

          <!-- 客户信息 -->
          <view class="contact-info">
            <view class="contact-header">
              <text class="contact-name">{{ contact.remarkName || contact.nickname || '未命名' }}</text>
              <view class="status-badge" :class="contact.followUpStatus || 'idle'">
                <text>{{ getStatusText(contact.followUpStatus) }}</text>
              </view>
            </view>

            <view class="contact-meta" v-if="contact.phoneNumber">
              <text class="meta-label">手机:</text>
              <text class="meta-value">{{ contact.phoneNumber }}</text>
            </view>

            <view class="contact-meta" v-if="contact.remarkInfo">
              <text class="meta-label">备注:</text>
              <text class="meta-value">{{ contact.remarkInfo }}</text>
            </view>

            <!-- 标签列表 -->
            <view class="contact-tags" v-if="contact.tags.length > 0">
              <text
                v-for="tag in contact.tags.slice(0, 3)"
                :key="tag"
                class="tag-badge"
              >{{ tag }}</text>
              <text v-if="contact.tags.length > 3" class="tag-more">+{{ contact.tags.length - 3 }}</text>
            </view>

            <!-- 保单数量 -->
            <view class="policy-count" v-if="contact.policies && contact.policies.length > 0">
              <text class="policy-icon">📋</text>
              <text>{{ contact.policies.length }} 份保单</text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="contact-actions">
            <button class="action-btn" @click.stop="showQuickFollowUp(contact)">跟进</button>
            <button class="action-btn primary" @click.stop="goToDetail(contact)">详情</button>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="displayContacts.length === 0">
        <text class="empty-icon">👥</text>
        <text class="empty-text">暂无客户数据</text>
        <button class="add-btn" @click="showAddModal">添加客户</button>
      </view>
    </scroll-view>

    <!-- 底部添加按钮 -->
    <view class="fab-button" @click="showAddModal" v-if="selectedContactIds.size === 0">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useContactsStore } from '../../stores/contacts';
import { Contact } from '../../types';

const store = useContactsStore();
const searchTerm = ref('');

// 从 store 获取数据
const contacts = computed(() => store.contacts);
const allTags = computed(() => store.allTags);
const selectedTags = computed(() => store.selectedTags);
const followUpFilter = computed(() => store.followUpFilter);
const selectedContactIds = computed(() => store.selectedContactIds);
const followingCount = computed(() => store.followingCount);

// 筛选后的联系人
const displayContacts = computed(() => {
  let result = store.filteredContacts;

  // 搜索筛选
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter(contact => {
      const progressText = contact.progressHistory?.map(p => p.content).join(' ') || contact.progress || '';
      return (
        (contact.nickname?.toLowerCase().includes(term)) ||
        (contact.remarkName?.toLowerCase().includes(term)) ||
        (contact.wxid?.toLowerCase().includes(term)) ||
        (contact.remarkInfo?.toLowerCase().includes(term)) ||
        (contact.phoneNumber?.toLowerCase().includes(term)) ||
        (progressText.toLowerCase().includes(term))
      );
    });
  }

  return result;
});

const getStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    'following': '跟进中',
    'contacted': '已沟通',
    'idle': '暂未跟进'
  };
  return statusMap[status || 'idle'] || '暂未跟进';
};

const onSearch = () => {
  // 搜索逻辑已在 computed 中处理
};

const clearTags = () => {
  store.clearTags();
};

const toggleTag = (tag: string) => {
  store.toggleTag(tag);
};

const setFollowUpFilter = (filter: 'idle' | 'following' | 'contacted' | null) => {
  store.followUpFilter = filter;
};

const toggleSelect = (id: string) => {
  store.toggleSelectContact(id);
};

const goToDetail = (contact: Contact) => {
  uni.navigateTo({
    url: `/pages/contact-detail/index?id=${contact.id}`
  });
};

const showQuickFollowUp = (contact: Contact) => {
  uni.navigateTo({
    url: `/pages/followup/index?contactId=${contact.id}`
  });
};

const showAddModal = () => {
  uni.navigateTo({
    url: '/pages/contact-detail/index?mode=add'
  });
};

const showBatchTagModal = (mode: 'add' | 'remove') => {
  uni.showActionSheet({
    itemList: mode === 'add' ? ['添加标签'] : ['删除标签'],
    success: () => {
      // 这里可以弹出标签选择器
    }
  });
};

const confirmBatchDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除选中的 ${selectedContactIds.value.size} 位客户吗？此操作无法撤销。`,
    confirmColor: '#ff4d4f',
    success: (res) => {
      if (res.confirm) {
        store.batchDeleteContacts();
      }
    }
  });
};

const loadMore = () => {
  // 分页加载逻辑
};
</script>

<style scoped>
.contact-list {
  height: 100vh;
  background-color: #f5f5f5;
}

.search-bar {
  position: relative;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 40px 0 12px;
  background-color: #f5f5f5;
  border-radius: 20px;
  font-size: 14px;
}

.search-icon {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
}

.filter-bar {
  background-color: #fff;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.tag-scroll {
  white-space: nowrap;
}

.tag-list {
  display: flex;
  padding: 0 12px;
  gap: 8px;
}

.tag-item {
  display: inline-flex;
  padding: 6px 14px;
  background-color: #f5f5f5;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
}

.tag-item.active {
  background-color: #333;
  color: #fff;
}

.status-filter {
  display: flex;
  padding: 12px 16px;
  background-color: #fff;
  gap: 12px;
  border-bottom: 1px solid #eee;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background-color: #f5f5f5;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
}

.status-item.active {
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

.batch-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.batch-info {
  font-size: 14px;
  color: #333;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.batch-btn {
  padding: 6px 12px;
  font-size: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  color: #333;
}

.batch-btn.danger {
  background-color: #ff4d4f;
  color: #fff;
}

.contact-scroll {
  flex: 1;
  height: calc(100vh - 200px);
}

.contact-grid {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-card {
  display: flex;
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.select-box {
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
}

.checkbox.checked {
  background-color: #333;
  border-color: #333;
}

.contact-info {
  flex: 1;
}

.contact-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.contact-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.status-badge.following {
  background-color: #e6f7ff;
  color: #1890ff;
}

.status-badge.contacted {
  background-color: #f6ffed;
  color: #52c41a;
}

.status-badge.idle {
  background-color: #f5f5f5;
  color: #999;
}

.contact-meta {
  display: flex;
  margin-bottom: 4px;
  font-size: 13px;
}

.meta-label {
  color: #999;
  margin-right: 4px;
}

.meta-value {
  color: #666;
}

.contact-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.tag-badge {
  padding: 2px 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 11px;
  color: #666;
}

.tag-more {
  padding: 2px 8px;
  font-size: 11px;
  color: #999;
}

.policy-count {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.policy-icon {
  font-size: 14px;
}

.contact-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 12px;
}

.action-btn {
  padding: 6px 12px;
  font-size: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  color: #666;
}

.action-btn.primary {
  background-color: #333;
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
