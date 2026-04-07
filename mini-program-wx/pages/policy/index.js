const storage = require('../../utils/storage.js')

Page({
  data: {
    policies: [],
    totalPremium: '0.00',
    activeCount: 0
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const contacts = storage.getContacts()
    const policies = []
    let totalPremium = 0
    let activeCount = 0

    contacts.forEach(contact => {
      if (contact.policies) {
        contact.policies.forEach(policy => {
          policies.push({
            ...policy,
            contactId: contact.id,
            contactName: contact.remarkName || contact.nickname || '未命名'
          })
          const premium = parseFloat(policy.premium) || 0
          totalPremium += premium
          if (policy.status === '有效' || policy.status === '正常') {
            activeCount++
          }
        })
      }
    })

    this.setData({
      policies,
      totalPremium: totalPremium.toFixed(2),
      activeCount
    })
  },

  goToContact(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/contact/index?id=${id}`
    })
  }
})
