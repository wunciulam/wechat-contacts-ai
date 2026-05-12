<template>
  <view class="policy-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        class="search-input"
        type="text"
        v-model="searchTerm"
        placeholder="搜索保单号、产品名称..."
        @input="onSearch"
      />
    </view>

    <!-- 统计卡片 -->
    <view class="stats-bar">
      <view class="stat-card">
        <text class="stat-value">{{ totalPolicies }}</text>
        <text class="stat-label">总保单数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ totalPremium }}</text>
        <text class="stat-label">总保费(元)</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ activePolicies }}</text>
        <text class="stat-label">有效保单</text>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <scroll-view class="filter-scroll" scroll-x>
        <view class="filter-list">
          <view
            class="filter-item"
            :class="{ active: selectedCategory === 'all' }"
            @click="selectedCategory = 'all'"
          >
            <text>全部</text>
          </view>
          <view
            v-for="category in categories"
            :key="category"
            class="filter-item"
            :class="{ active: selectedCategory === category }"
            @click="selectedCategory = category"
          >
            <text>{{ category }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 保单列表 -->
    <scroll-view class="policy-list" scroll-y>
      <view class="policy-grid">
        <view
          v-for="item in filteredPolicies"
          :key="item.policy.id"
          class="policy-card"
          @click="goToContact(item.contactId)"
        >
          <view class="policy-header">
            <view class="policy-info">
              <text class="policy-name">{{ item.policy.productName }}</text>
              <text class="policy-number">{{ item.policy.policyNumber }}</text>
            </view>
            <view class="status-badge" :class="getStatusClass(item.policy.status)">
              <text>{{ item.policy.status }}</text>
            </view>
          </view>

          <view class="policy-body">
            <view class="info-row">
              <text class="info-label">投保人:</text>
              <text class="info-value">{{ item.policy.applicant }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">被保人:</text>
              <text class="info-value">{{ item.policy.insured }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">保费:</text>
              <text class="info-value premium">¥{{ item.policy.premium }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">生效日期:</text>
              <text class="info-value">{{ item.policy.effectiveDate }}</text>
            </view>
          </view>

          <view class="policy-footer">
            <view class="contact-info">
              <text class="contact-label">所属客户:</text>
              <text class="contact-name">{{ item.contactName }}</text>
            </view>
            <button class="detail-btn" @click.stop="goToContact(item.contactId)">
              <text>查看</text>
            </button>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="filteredPolicies.length === 0">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无保单数据</text>
        <button class="add-btn" @click="goToAdd">添加保单</button>
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
import { Policy } from '../../types';

interface PolicyWithContact extends Policy {
  contactId: string;
  contactName: string;
  category: string;
}

const store = useContactsStore();
const searchTerm = ref('');
const selectedCategory = ref('all');

// 保单分类
const categories = ['重疾险', '养老金', '医疗险', '储蓄险', '意外险', '车险', '其他保险'];

const getPolicyCategory = (name: string): string => {
  if (!name) return '其他保险';
  const n = name;
  if (n.includes('重疾') || n.includes('重大疾病') || n.includes('癌') || n.includes('百病') || n.includes('恶性肿瘤')) return '重疾险';
  if (n.includes('年金') || n.includes('养老') || n.includes('退休') || n.includes('教育')) return '养老金';
  if (n.includes('医疗') || n.includes('住院') || n.includes('医保') || n.includes('门诊')) return '医疗险';
  if (n.includes('寿') || n.includes('增额') || n.includes('两全') || n.includes('储蓄') || n.includes('分红') || n.includes('万能')) return '储蓄险';
  if (n.includes('意外')) return '意外险';
  if (n.includes('车')) return '车险';
  return '其他保险';
};

// 获取所有保单
const allPolicies = computed(() => {
  const policies: PolicyWithContact[] = [];
  store.contacts.forEach(contact => {
    if (contact.policies) {
      contact.policies.forEach(policy => {
        policies.push({
          ...policy,
          contactId: contact.id,
          contactName: contact.remarkName || contact.nickname || '未命名',
          category: getPolicyCategory(policy.productName)
        });
      });
    }
  });
  return policies;
});

// 筛选后的保单
const filteredPolicies = computed(() => {
  let result = allPolicies.value;

  // 分类筛选
  if (selectedCategory.value !== 'all') {
    result = result.filter(p => p.category === selectedCategory.value);
  }

  // 搜索筛选
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter(p =>
      p.productName.toLowerCase().includes(term) ||
      p.policyNumber.toLowerCase().includes(term) ||
      p.applicant.toLowerCase().includes(term) ||
      p.insured.toLowerCase().includes(term) ||
      p.company.toLowerCase().includes(term)
    );
  }

  return result;
});

// 统计数据
const totalPolicies = computed(() => allPolicies.value.length);
const totalPremium = computed(() => {
  return allPolicies.value.reduce((sum, p) => {
    const premium = parseFloat(p.premium) || 0;
    return sum + premium;
  }, 0).toFixed(2);
});
const activePolicies = computed(() => {
  return allPolicies.value.filter(p => p.status === '有效' || p.status === '正常').length;
});

const getStatusClass = (status: string) => {
  if (status === '有效' || status === '正常') return 'active';
  if (status === '失效' || status === '终止') return 'inactive';
  return 'pending';
};

const onSearch = () => {
  // 搜索逻辑在 computed 中处理
};

const goToContact = (contactId: string) => {
  uni.navigateTo({
    url: `/pages/contact-detail/index?id=${contactId}`
  });
};

const goToAdd = () => {
  uni.navigateTo({
    url: '/pages/contact-detail/index?mode=add-policy'
  });
};
</script>

<style scoped>
.policy-page {
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

.stats-bar {
  display: flex;
  padding: 16px;
  gap: 12px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.stat-card {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
}

.filter-bar {
  background-color: #fff;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.filter-scroll {
  white-space: nowrap;
}

.filter-list {
  display: flex;
  padding: 0 12px;
  gap: 8px;
}

.filter-item {
  display: inline-flex;
  padding: 6px 14px;
  background-color: #f5f5f5;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
}

.filter-item.active {
  background-color: #333;
  color: #fff;
}

.policy-list {
  height: calc(100vh - 280px);
  padding: 12px;
}

.policy-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.policy-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.policy-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.policy-info {
  flex: 1;
}

.policy-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.policy-number {
  font-size: 12px;
  color: #999;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.status-badge.active {
  background-color: #f6ffed;
  color: #52c41a;
}

.status-badge.inactive {
  background-color: #fff2f0;
  color: #ff4d4f;
}

.status-badge.pending {
  background-color: #fff7e6;
  color: #ffa940;
}

.policy-body {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  margin-bottom: 6px;
}

.info-label {
  width: 70px;
  font-size: 13px;
  color: #999;
}

.info-value {
  flex: 1;
  font-size: 13px;
  color: #333;
}

.info-value.premium {
  color: #ff4d4f;
  font-weight: 600;
}

.policy-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

.contact-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.contact-label {
  font-size: 12px;
  color: #999;
}

.contact-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.detail-btn {
  padding: 4px 12px;
  background-color: #333;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
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
