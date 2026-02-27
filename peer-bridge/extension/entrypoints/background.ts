export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    console.log('[peer-bridge] Extension installed.')
  })

  chrome.action.onClicked.addListener((tab) => {
    if (!tab?.id) return
    console.log('[peer-bridge] Toolbar icon clicked. Opening side panel...')
    chrome.sidePanel.open({ tabId: tab.id })
  })
})
