async(page)=>({url:page.url(),dialogs:await page.getByRole('dialog').allTextContents()})
