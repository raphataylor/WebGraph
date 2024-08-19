console.log("Content script loaded");

chrome.runtime.sendMessage({action: "contentScriptReady"});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureSnapshot") {
    html2canvas(document.body).then(canvas => {
      const snapshot = canvas.toDataURL('image/png');
      sendResponse({snapshot: snapshot});
    });
    return true; // Indicates that the response is sent asynchronously
  }
});