/**
 * background.js – Peer Bridge Service Worker
 *
 * Opens the side panel when the user clicks the extension toolbar icon.
 * The side panel persists independently of popup open/close cycles.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("[peer-bridge] Extension installed.");
});

// Open the side panel on toolbar icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});
