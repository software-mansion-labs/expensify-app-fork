import {observeEntries, readEntryNumber, readPaintedAt} from './performanceEntries';

type InputPaint = {
    paintedAt: number;
    eventName: string;
    interactionId: number;
    hasPresentationTime: boolean;
};

/** Event Timing drops an event's entry when it is shorter than this, so the observer then never calls back. */
const MIN_DURATION_THRESHOLD_MS = 16;

function isEventTiming(entry: PerformanceEntry): entry is PerformanceEventTiming {
    return 'interactionId' in entry;
}

/** Event Timing stamps an entry with its event's timeStamp; the entry ends at the first paint after the event's handlers ran. */
function observeInputPaint(inputTimeStamp: number, inputType: string, onPaint: (paint: InputPaint) => void) {
    const entriesObserver = observeEntries(
        'event',
        (entries) => {
            // Pointer, mouse and click events of one tap can share a timestamp, so match the event that called onPress.
            const entry = entries.filter(isEventTiming).find((candidate) => candidate.name === inputType && Math.abs(candidate.startTime - inputTimeStamp) < 1);
            if (!entry) {
                return;
            }
            entriesObserver?.disconnect();
            onPaint({
                paintedAt: readPaintedAt(entry),
                eventName: entry.name,
                interactionId: entry.interactionId,
                hasPresentationTime: readEntryNumber(entry, 'presentationTime') !== undefined,
            });
        },
        {durationThreshold: MIN_DURATION_THRESHOLD_MS},
    );
    return entriesObserver?.disconnect;
}

export default observeInputPaint;
export type {InputPaint};
