const storage = require('../../utils/storage.js')

Page({
  data: {
    isEdit: false,
    contactId: '',
    form: {
      remarkName: '',
      nickname: '',
      wxid: '',
      phoneNumber: '',
      idCard: '',
      remarkInfo: ''
    }
  },

  onLoad(options) {
    if (options.id) {
      const contact = storage.getContactById(options.id)
      if (contact) {
        this.setData({
          isEdit: true,
          contactId: options.id,
          form: {
            remarkName: contact.remarkName || '',
            nickname: contact.nickname || '',
            wxid: contact.wxid || '',
            phoneNumber: contact.phoneNumber || '',
            idCard: contact.idCard || '',
            remarkInfo: contact.remarkInfo || ''
          }
        })
      }
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    this.setData({
      [`form.${field}`]: value
    })
  },

  save() {
    const { form, isEdit, contactId } = this.data
    if (!form.remarkName) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }

    if (isEdit) {
      storage.updateContact(contactId, form)
    } else {
      storage.addContact(form)
    }

    wx.showToast({ title: '保存成功' })
    setTimeout(() => {
      wx.navigateBack()
    }, 1000)
  },

  deleteContact() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这位客户吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          storage.deleteContact(this.data.contactId)
          wx.showToast({ title: '删除成功' })
          setTimeout(() => {
            wx.navigateBack()
          }, 1000)
        }
      }
    })
  }
})
