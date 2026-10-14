function afterNextFrame(callback: () => void) {
    requestAnimationFrame(callback);
}

function afterDoubleFrame(callback: () => void) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
}

/** rAF runs before the paint of its frame; a message posted from it is delivered after that paint. */
function afterNextPaint(callback: () => void) {
    requestAnimationFrame(() => {
        const channel = new MessageChannel();
        channel.port1.onmessage = callback;
        channel.port2.postMessage(undefined);
    });
}

export {afterDoubleFrame, afterNextFrame, afterNextPaint};
