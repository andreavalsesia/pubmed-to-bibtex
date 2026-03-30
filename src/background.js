chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "open_side_panel") {
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }
});
