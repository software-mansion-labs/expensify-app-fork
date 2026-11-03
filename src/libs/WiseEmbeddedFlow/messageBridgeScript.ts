/**
 * Runs in the WebView before Wise's page loads and forwards the window messages Wise's hosted form posts to the app,
 * since a page in a WebView has no parent window to post to.
 */
const messageBridgeScript = `
window.addEventListener('message', function (event) {
    window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
});
true;
`;

export default messageBridgeScript;
