import {useEffectEvent, useLayoutEffect} from 'react';

import type {PaintObserverProps} from './types';

/**
 * Reports when the commit that set `paintKey` is painted. The layout effect runs in the commit, the animation frame
 * right before the next paint, and a message posted from it right after that paint.
 */
function PaintObserver({paintKey, onPaint, children}: PaintObserverProps) {
    const reportPaint = useEffectEvent(() => onPaint({paintTime: performance.now()}));

    useLayoutEffect(() => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => reportPaint();
        const frame = requestAnimationFrame(() => channel.port2.postMessage(null));

        return () => {
            cancelAnimationFrame(frame);
            channel.port1.close();
        };
    }, [paintKey]);

    return children;
}

export default PaintObserver;
