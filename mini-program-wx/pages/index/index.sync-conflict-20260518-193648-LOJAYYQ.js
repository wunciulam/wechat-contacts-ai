const app = getApp()
const storage = require('../../utils/storage.js')

Page({
  data: {
    contacts: [],
    filteredContacts: [],
    searchTerm: '',
    statusFilter: '',
    followingCount: 0,
    policyCount: 0,
    loading: false,
    statusText: {
      following: '跟进中',
      contacted: '已沟通',
      idle: '暂未跟进'
    }
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    this.setData({ loading: true })

    const contacts = storage.getContacts()
    const followingCount = contacts.filter(c => c.followUpStatus === 'following').length
    const policyCount = contacts.filter(c => c.policies && c.policies.length > 0).length

    this.setData({
      contacts,
      filteredContacts: contacts,
      followingCount,
      policyCount,
      loading: false
    })
  },

  onSearch(e) {
    const searchTerm = e.detail.value
    this.setData({ searchTerm })
    this.applyFilters(searchTerm, this.data.statusFilter)
  },

  clearSearch() {
    this.setData({ searchTerm: '' })
    this.applyFilters('', this.data.statusFilter)
  },

  filterByStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ statusFilter: status })
    this.applyFilters(this.data.searchTerm, status)
  },

  applyFilters(searchTerm, statusFilter) {
    let filtered = this.data.contacts

    // 搜索筛选
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => {
        const name = (c.remarkName || c.nickname || '').toLowerCase()
        const phone = (c.phoneNumber || '').toLowerCase()
        return name.includes(term) || phone.includes(term)
      })
    }

    // 状态筛选
    if (statusFilter) {
      filtered = filtered.filter(c => (c.followUpStatus || 'idle') === statusFilter)
    }

    this.setData({ filteredContacts: filtered })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/contact/index?id=${id}`
    })
  },

  addContact() {
    wx.navigateTo({
      url: '/pages/contact/index?mode=add'
    })
  }
})
