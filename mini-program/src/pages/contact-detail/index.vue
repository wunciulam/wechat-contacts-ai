<template>
  <view class="detail-page">
    <scroll-view class="detail-scroll" scroll-y>
      <!-- 客户基本信息卡片 -->
      <view class="info-card">
        <view class="card-header">
          <text class="card-title">基本信息</text>
          <button class="edit-btn" @click="isEditing = !isEditing">
            <text>{{ isEditing ? '取消' : '编辑' }}</text>
          </button>
        </view>

        <view class="form-group">
          <view class="form-item">
            <text class="form-label">姓名</text>
            <input
              v-if="isEditing"
              class="form-input"
              v-model="form.remarkName"
              placeholder="请输入姓名"
            />
            <text v-else class="form-value">{{ contact?.remarkName || '-' }}</text>
          </view>

          <view class="form-item">
            <text class="form-label">昵称</text>
            <input
              v-if="isEditing"
              class="form-input"
              v-model="form.nickname"
              placeholder="请输入昵称"
            />
            <text v-else class="form-value">{{ contact?.nickname || '-' }}</text>
          </view>

          <view class="form-item">
            <text class="form-label">手机号</text>
            <input
              v-if="isEditing"
              class="form-input"
              v-model="form.phoneNumber"
              placeholder="请输入手机号"
              type="number"
            />
            <text v-else class="form-value">{{ contact?.phoneNumber || '-' }}</text>
          </view>

          <view class="form-item">
            <text class="form-label">微信号</text>
            <input
              v-if="isEditing"
              class="form-input"
              v-model="form.wxid"
              placeholder="请输入微信号"
            />
            <text v-else class="form-value">{{ contact?.wxid || '-' }}</text>
          </view>

          <view class="form-item">
            <text class="form-label">身份证号</text>
            <input
              v-if="isEditing"
              class="form-input"
              v-model="form.idCard"
              placeholder="请输入身份证号"
            />
            <text v-else class="form-value">{{ contact?.idCard || '-' }}</text>
          </view>

          <view class="form-item">
            <text class="form-label">地址</text>
            <input
              v-if="isEditing"
              class="form-input"
              v-model="form.address"
              placeholder="请输入地址"
            />
            <text v-else class="form-value">{{ contact?.address || '-' }}</text>
          </view>

          <view class="form-item">
            <text class="form-label">银行账号</text>
            <input
              v-if="isEditing"
              class="form-input"
              v-model="form.bankAccount"
              placeholder="请输入银行账号"
            />
            <text v-else class="form-value">{{ contact?.bankAccount || '-' }}</text>
          </view>

          <view class="form-item">
            <text class="form-label">备注</text>
            <textarea
              v-if="isEditing"
              class="form-textarea"
              v-model="form.remarkInfo"
              placeholder="请输入备注"
            />
            <text v-else class="form-value">{{ contact?.remarkInfo || '-' }}</text>
          </view>
        </view>

        <view v-if="isEditing" class="form-actions">
          <button class="save-btn" @click="saveContact">
            <text>保存</text>
          </button>
        </view>
      </view>

      <!-- 跟进状态 -->
      <view class="status-card">
        <text class="card-title">跟进状态</text>
        <view class="status-options">
          <view
            v-for="status in followUpStatuses"
            :key="status.value"
            class="status-option"
            :class="{ active: (contact?.followUpStatus || 'idle') === status.value }"
            @click="updateStatus(status.value)"
          >
            <text>{{ status.label }}</text>
          </view>
        </view>
      </view>

      <!-- 标签管理 -->
      <view class="tags-card">
        <view class="card-header">
          <text class="card-title">标签</text>
          <button class="add-tag-btn" @click="showAddTag = true">
            <text>+ 添加</text>
          </button>
        </view>
        <view class="tags-list">
          <view
            v-for="tag in contact?.tags || []"
            :key="tag"
            class="tag-item"
          >
            <text>{{ tag }}</text>
            <text class="tag-remove" @click="removeTag(tag)">×</text>
          </view>
        </view>
        <view v-if="(contact?.tags || []).length === 0" class="empty-tags">
          <text>暂无标签</text>
        </view>
      </view>

      <!-- 跟进记录 -->
      <view class="records-card">
        <view class="card-header">
          <text class="card-title">跟进记录</text>
          <button class="add-record-btn" @click="showAddRecord = true">
            <text>+ 添加</text>
          </button>
        </view>
        <view class="records-list">
          <view
            v-for="record in sortedRecords"
            :key="record.id"
            class="record-item"
          >
            <view class="record-date">{{ record.date }}</view>
            <view class="record-content">{{ record.content }}</view>
            <view class="record-status" :class="{ completed: record.completed }">
              <text>{{ record.completed ? '✓ 已完成' : '○ 待跟进' }}</text>
            </view>
          </view>
        </view>
        <view v-if="(contact?.progressHistory || []).length === 0" class="empty-records">
          <text>暂无跟进记录</text>
        </view>
      </view>

      <!-- 保单列表 -->
      <view class="policies-card">
        <view class="card-header">
          <text class="card-title">保单</text>
          <button class="add-policy-btn" @click="showAddPolicy = true">
            <text>+ 添加</text>
          </button>
        </view>
        <view class="policies-list">
          <view
            v-for="policy in contact?.policies || []"
            :key="policy.id"
            class="policy-item"
          >
            <view class="policy-header">
              <text class="policy-name">{{ policy.productName }}</text>
              <text class="policy-status" :class="getPolicyStatusClass(policy.status)">
                {{ policy.status }}
              </text>
            </view>
            <view class="policy-info">
              <text class="policy-number">保单号: {{ policy.policyNumber }}</text>
              <text class="policy-premium">保费: ¥{{ policy.premium }}</text>
            </view>
            <view class="policy-date">
              <text>生效日期: {{ policy.effectiveDate }}</text>
            </view>
          </view>
        </view>
        <view v-if="(contact?.policies || []).length === 0" class="empty-policies">
          <text>暂无保单</text>
        </view>
      </view>

      <!-- 删除按钮 -->
      <view class="delete-section">
        <button class="delete-btn" @click="confirmDelete">
          <text>删除客户</text>
        </button>
      </view>
    </scroll-view>

    <!-- 添加标签弹窗 -->
    <view class="modal" v-if="showAddTag">
      <view class="modal-mask" @click="showAddTag = false"></view>
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">添加标签</text>
          <text class="modal-close" @click="showAddTag = false">×</text>
        </view>
        <view class="modal-body">
          <input
            class="tag-input"
            v-model="newTag"
            placeholder="输入标签名称"
          />
          <view class="existing-tags">
            <text class="tags-label">已有标签:</text>
            <view class="tags-list">
              <view
                v-for="tag in availableTags"
                :key="tag"
                class="tag-option"
                @click="selectTag(tag)"
              >
                <text>{{ tag }}</text>
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="showAddTag = false">取消</button>
          <button class="btn-confirm" @click="addTag">确定</button>
        </view>
      </view>
    </view>

    <!-- 添加跟进记录弹窗 -->
    <view class="modal" v-if="showAddRecord">
      <view class="modal-mask" @click="showAddRecord = false"></view>
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">添加跟进记录</text>
          <text class="modal-close" @click="showAddRecord = false">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">日期</text>
            <picker mode="date" :value="newRecord.date" @change="onDateChange">
              <view class="picker-value">{{ newRecord.date }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">内容</text>
            <textarea
              class="form-textarea"
              v-model="newRecord.content"
              placeholder="请输入跟进内容"
            />
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="showAddRecord = false">取消</button>
          <button class="btn-confirm" @click="addRecord">确定</button>
        </view>
      </view>
    </view>

    <!-- 添加保单弹窗 -->
    <view class="modal" v-if="showAddPolicy">
      <view class="modal-mask" @click="showAddPolicy = false"></view>
      <view class="modal-content large">
        <view class="modal-header">
          <text class="modal-title">添加保单</text>
          <text class="modal-close" @click="showAddPolicy = false">×</text>
        </view>
        <scroll-view class="modal-body" scroll-y>
          <view class="form-item">
            <text class="form-label">保单号 *</text>
            <input class="form-input" v-model="newPolicy.policyNumber" placeholder="请输入保单号" />
          </view>
          <view class="form-item">
            <text class="form-label">产品名称 *</text>
            <input class="form-input" v-model="newPolicy.productName" placeholder="请输入产品名称" />
          </view>
          <view class="form-item">
            <text class="form-label">保险公司</text>
            <input class="form-input" v-model="newPolicy.company" placeholder="请输入保险公司" />
          </view>
          <view class="form-item">
            <text class="form-label">保费</text>
            <input class="form-input" v-model="newPolicy.premium" placeholder="请输入保费" type="digit" />
          </view>
          <view class="form-item">
            <text class="form-label">生效日期</text>
            <picker mode="date" :value="newPolicy.effectiveDate" @change="onPolicyDateChange">
              <view class="picker-value">{{ newPolicy.effectiveDate || '请选择日期' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">状态</text>
            <picker :range="policyStatusOptions" :value="policyStatusIndex" @change="onStatusChange">
              <view class="picker-value">{{ newPolicy.status }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">投保人</text>
            <input class="form-input" v-model="newPolicy.applicant" placeholder="请输入投保人姓名" />
          </view>
          <view class="form-item">
            <text class="form-label">被保人</text>
            <input class="form-input" v-model="newPolicy.insured" placeholder="请输入被保人姓名" />
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="showAddPolicy = false">取消</button>
          <button class="btn-confirm" @click="addPolicy">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useContactsStore } from '../../stores/contacts';
import { Contact, Policy, ProgressRecord } from '../../types';

const store = useContactsStore();
const contactId = ref('');
const isEditing = ref(false);
const isNew = ref(false);

// 表单数据
const form = ref({
  remarkName: '',
  nickname: '',
  wxid: '',
  phoneNumber: '',
  idCard: '',
  address: '',
  bankAccount: '',
  remarkInfo: ''
});

// 弹窗状态
const showAddTag = ref(false);
const showAddRecord = ref(false);
const showAddPolicy = ref(false);

// 新数据
const newTag = ref('');
const newRecord = ref({
  date: new Date().toISOString().split('T')[0],
  content: ''
});
const newPolicy = ref({
  policyNumber: '',
  productName: '',
  company: '',
  premium: '',
  effectiveDate: '',
  status: '有效',
  applicant: '',
  insured: ''
});

const policyStatusOptions = ['有效', '失效', '终止', '正常'];
const policyStatusIndex = computed(() => {
  return policyStatusOptions.indexOf(newPolicy.value.status);
});

// 获取当前客户
const contact = computed(() => {
  return store.contacts.find(c => c.id === contactId.value);
});

// 跟进状态选项
const followUpStatuses = [
  { value: 'following', label: '跟进中' },
  { value: 'contacted', label: '已沟通' },
  { value: 'idle', label: '暂未跟进' }
];

// 排序后的跟进记录
const sortedRecords = computed(() => {
  const records = contact.value?.progressHistory || [];
  return [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

// 可用标签（排除已存在的）
const availableTags = computed(() => {
  const existing = new Set(contact.value?.tags || []);
  return store.allTags.filter(tag => !existing.has(tag));
});

// 生成ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// 获取保单状态样式
const getPolicyStatusClass = (status: string) => {
  if (status === '有效' || status === '正常') return 'active';
  if (status === '失效' || status === '终止') return 'inactive';
  return '';
};

// 初始化
onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = currentPage.$page?.options || {};

  contactId.value = options.id || '';
  isNew.value = options.mode === 'add';

  if (contactId.value && contact.value) {
    // 初始化表单
    form.value = {
      remarkName: contact.value.remarkName || '',
      nickname: contact.value.nickname || '',
      wxid: contact.value.wxid || '',
      phoneNumber: contact.value.phoneNumber || '',
      idCard: contact.value.idCard || '',
      address: contact.value.address || '',
      bankAccount: contact.value.bankAccount || '',
      remarkInfo: contact.value.remarkInfo || ''
    };
  }

  if (isNew.value) {
    isEditing.value = true;
  }
});

// 保存客户
const saveContact = () => {
  if (isNew.value) {
    store.addContact({
      ...form.value,
      tags: ['潜在客户'],
      dealProducts: [],
      intentProducts: [],
      policies: [],
      progressHistory: []
    });
    uni.navigateBack();
  } else {
    store.updateContact(contactId.value, form.value);
    isEditing.value = false;
  }
};

// 更新跟进状态
const updateStatus = (status: 'idle' | 'following' | 'contacted') => {
  store.updateFollowUpStatus(contactId.value, status);
};

// 添加标签
const addTag = () => {
  if (newTag.value.trim()) {
    store.addTagToContact(contactId.value, newTag.value.trim());
    newTag.value = '';
    showAddTag.value = false;
  }
};

// 选择已有标签
const selectTag = (tag: string) => {
  store.addTagToContact(contactId.value, tag);
  showAddTag.value = false;
};

// 移除标签
const removeTag = (tag: string) => {
  store.removeTagFromContact(contactId.value, tag);
};

// 日期选择
const onDateChange = (e: any) => {
  newRecord.value.date = e.detail.value;
};

const onPolicyDateChange = (e: any) => {
  newPolicy.value.effectiveDate = e.detail.value;
};

const onStatusChange = (e: any) => {
  newPolicy.value.status = policyStatusOptions[e.detail.value];
};

// 添加跟进记录
const addRecord = () => {
  if (!newRecord.value.content.trim()) {
    uni.showToast({ title: '请输入内容', icon: 'none' });
    return;
  }

  const record: ProgressRecord = {
    id: Date.now().toString(),
    date: newRecord.value.date,
    content: newRecord.value.content,
    completed: false
  };

  store.addProgress(contactId.value, record);
  newRecord.value.content = '';
  showAddRecord.value = false;
  uni.showToast({ title: '添加成功' });
};

// 添加保单
const addPolicy = () => {
  if (!newPolicy.value.policyNumber.trim() || !newPolicy.value.productName.trim()) {
    uni.showToast({ title: '请填写必填项', icon: 'none' });
    return;
  }

  const policy: Policy = {
    id: generateId(),
    policyNumber: newPolicy.value.policyNumber,
    productName: newPolicy.value.productName,
    company: newPolicy.value.company,
    premium: newPolicy.value.premium,
    effectiveDate: newPolicy.value.effectiveDate,
    status: newPolicy.value.status,
    applicant: newPolicy.value.applicant,
    insured: newPolicy.value.insured
  };

  store.addPolicy(contactId.value, policy);

  // 重置表单
  newPolicy.value = {
    policyNumber: '',
    productName: '',
    company: '',
    premium: '',
    effectiveDate: '',
    status: '有效',
    applicant: '',
    insured: ''
  };

  showAddPolicy.value = false;
  uni.showToast({ title: '添加成功' });
};

// 删除确认
const confirmDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这位客户吗？此操作无法撤销。',
    confirmColor: '#ff4d4f',
    success: (res) => {
      if (res.confirm) {
        store.deleteContact(contactId.value);
        uni.navigateBack();
      }
    }
  });
};
</script>

<style scoped>
.detail-page {
  height: 100vh;
  background-color: #f5f5f5;
}

.detail-scroll {
  padding: 12px;
  padding-bottom: 40px;
}

.info-card,
.status-card,
.tags-card,
.records-card,
.policies-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.edit-btn {
  padding: 4px 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  color: #666;
}

.form-input,
.form-textarea,
.picker-value {
  padding: 10px 12px;
  background-color: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
}

.form-textarea {
  min-height: 80px;
}

.form-value {
  padding: 10px 0;
  font-size: 14px;
  color: #333;
}

.form-actions {
  margin-top: 16px;
}

.save-btn {
  width: 100%;
  padding: 12px;
  background-color: #333;
  color: #fff;
  border-radius: 8px;
  font-size: 15px;
}

.status-options {
  display: flex;
  gap: 12px;
}

.status-option {
  flex: 1;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 8px;
  text-align: center;
  font-size: 13px;
  color: #666;
}

.status-option.active {
  background-color: #333;
  color: #fff;
}

.add-tag-btn,
.add-record-btn,
.add-policy-btn {
  padding: 4px 10px;
  background-color: #333;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
}

.tag-remove {
  color: #ff4d4f;
  font-size: 14px;
  margin-left: 4px;
}

.empty-tags,
.empty-records,
.empty-policies {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  padding: 12px;
  background-color: #f8f8f8;
  border-radius: 8px;
}

.record-date {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.record-content {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  margin-bottom: 8px;
}

.record-status {
  font-size: 12px;
  color: #ffa940;
}

.record-status.completed {
  color: #52c41a;
}

.policies-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.policy-item {
  padding: 12px;
  background-color: #f8f8f8;
  border-radius: 8px;
}

.policy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.policy-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.policy-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  background-color: #f6ffed;
  color: #52c41a;
}

.policy-status.inactive {
  background-color: #fff2f0;
  color: #ff4d4f;
}

.policy-info {
  display: flex;
  gap: 16px;
  margin-bottom: 4px;
}

.policy-number,
.policy-premium {
  font-size: 12px;
  color: #666;
}

.policy-date {
  font-size: 12px;
  color: #999;
}

.delete-section {
  margin-top: 20px;
  padding: 0 12px;
}

.delete-btn {
  width: 100%;
  padding: 12px;
  background-color: #ff4d4f;
  color: #fff;
  border-radius: 8px;
  font-size: 15px;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  width: 85%;
  max-width: 400px;
  max-height: 80%;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.modal-content.large {
  max-height: 85%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  font-size: 24px;
  color: #999;
  line-height: 1;
}

.modal-body {
  padding: 16px;
  max-height: 400px;
}

.modal-footer {
  display: flex;
  padding: 12px 16px;
  gap: 12px;
  border-top: 1px solid #eee;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background-color: #333;
  color: #fff;
}

.tag-input {
  width: 100%;
  padding: 10px 12px;
  background-color: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.existing-tags {
  margin-top: 16px;
}

.tags-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.tag-option {
  display: inline-block;
  padding: 4px 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  margin-right: 8px;
  margin-bottom: 8px;
}
</style>
