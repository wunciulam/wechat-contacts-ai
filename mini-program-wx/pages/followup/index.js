const storage = require('../../utils/storage.js')

Page({
  data: {
    records: [],
    pendingCount: 0
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const contacts = storage.getContacts()
    const records = []
    let pendingCount = 0

    contacts.forEach(contact => {
      if (contact.progressHistory) {
        contact.progressHistory.forEach(record => {
          if (!record.completed) pendingCount++
          records.push({
            ...record,
            contactId: contact.id,
            contactName: contact.remarkName || contact.nickname || '未命名'
          })
        })
      }
    })

    records.sort((a, b) => new Date(b.date) - new Date(a.date))

    this.setData({
      records,
      pendingCount
    })
  },

  goToContact(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/contact/index?id=${id}`
    })
  }
})
