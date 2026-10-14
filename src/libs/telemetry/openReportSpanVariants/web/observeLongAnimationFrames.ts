import {observeEntries, readEntryNumber} from './performanceEntries';

type LongAnimationFrame = {
    startTime: number;
    /** End of the frame's rendering update, before the compositor presents it. */
    endTime: number;
    blockingDuration: number;
};

/** Long Animation Frames reports every frame longer than 50 ms, after the frame; only frames that start after `since` count. */
function observeLongAnimationFrames(since: number, onFrame: (frame: LongAnimationFrame) => void) {
    return observeEntries('long-animation-frame', (entries) => {
        for (const entry of entries) {
            if (entry.startTime < since) {
                continue;
            }
            onFrame({startTime: entry.startTime, endTime: entry.startTime + entry.duration, blockingDuration: readEntryNumber(entry, 'blockingDuration') ?? 0});
        }
    });
}

export default observeLongAnimationFrames;
export type {LongAnimationFrame};
