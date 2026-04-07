const CONTACTS_KEY = 'wechat-contacts'
const APP_ID_KEY = 'wechat_app_id'

const generateId = () => Math.random().toString(36).substr(2, 9)

const getAppId = () => {
  let appId = wx.getStorageSync(APP_ID_KEY)
  if (!appId) {
    appId = `app_${Math.random().toString(36).slice(2, 17)}`
    wx.setStorageSync(APP_ID_KEY, appId)
  }
  return appId
}

module.exports = {
  getContacts() {
    return wx.getStorageSync(CONTACTS_KEY) || []
  },

  saveContacts(contacts) {
    wx.setStorageSync(CONTACTS_KEY, contacts)
  },

  addContact(contact) {
    const contacts = this.getContacts()
    contacts.unshift({
      ...contact,
      id: generateId(),
      addedAt: Date.now(),
      tags: contact.tags || ['潜在客户'],
      policies: contact.policies || [],
      progressHistory: contact.progressHistory || [],
      followUpStatus: contact.followUpStatus || 'following'
    })
    this.saveContacts(contacts)
    return contacts
  },

  updateContact(id, updates) {
    const contacts = this.getContacts()
    const index = contacts.findIndex(c => c.id === id)
    if (index !== -1) {
      contacts[index] = { ...contacts[index], ...updates }
      this.saveContacts(contacts)
    }
    return contacts
  },

  deleteContact(id) {
    const contacts = this.getContacts().filter(c => c.id !== id)
    this.saveContacts(contacts)
    return contacts
  },

  getContactById(id) {
    return this.getContacts().find(c => c.id === id)
  },

  addPolicy(contactId, policy) {
    const contacts = this.getContacts()
    const contact = contacts.find(c => c.id === contactId)
    if (contact) {
      contact.policies = contact.policies || []
      contact.policies.push({
        ...policy,
        id: generateId()
      })
      if (!contact.tags.includes('成交客户')) {
        contact.tags.push('成交客户')
      }
      this.saveContacts(contacts)
    }
    return contacts
  },

  addProgress(contactId, record) {
    const contacts = this.getContacts()
    const contact = contacts.find(c => c.id === contactId)
    if (contact) {
      contact.progressHistory = contact.progressHistory || []
      contact.progressHistory.unshift({
        ...record,
        id: Date.now().toString()
      })
      contact.followUpStatus = 'following'
      this.saveContacts(contacts)
    }
    return contacts
  },

  getAppId
}
