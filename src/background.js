chrome.action.onClicked.addListener(async activeTab => {
  const granted = await chrome.permissions.request({
    permissions: ['scripting'],
    origins: [activeTab.url],
  });
  if (granted) {
    try {
      await chrome.scripting.registerContentScripts([
        {
          id: 'content',
          runAt: 'document_start',
          matches: ['https://*/*'],
          js: ['content.js'],
        },
      ]);
    } catch {
      // ignore
    }
    await chrome.scripting.executeScript({
      files: ['content.js'],
      target: { tabId: activeTab.id },
    });
  }
});
