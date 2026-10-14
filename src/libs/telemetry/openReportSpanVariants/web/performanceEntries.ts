/** Reads a numeric field the DOM lib does not type yet (Element Timing, Long Animation Frames, paint timing). */
function readEntryNumber(entry: PerformanceEntry, field: string): number | undefined {
    const value: unknown = Reflect.get(entry, field);
    return typeof value === 'number' ? value : undefined;
}

function readEntryString(entry: PerformanceEntry, field: string): string | undefined {
    const value: unknown = Reflect.get(entry, field);
    return typeof value === 'string' ? value : undefined;
}

function readPositiveNumber(entry: PerformanceEntry, field: string): number | undefined {
    const value = readEntryNumber(entry, field);
    return value !== undefined && value > 0 ? value : undefined;
}

/**
 * When the entry's paint reached the screen: the compositor's `presentationTime` where Chromium exposes paint timing,
 * else the render time (Element Timing), else the entry's end (Event Timing, soft navigation).
 */
function readPaintedAt(entry: PerformanceEntry): number {
    return readPositiveNumber(entry, 'presentationTime') ?? readPositiveNumber(entry, 'renderTime') ?? entry.startTime + entry.duration;
}

function isEntryTypeSupported(entryType: string): boolean {
    return typeof PerformanceObserver !== 'undefined' && !!PerformanceObserver.supportedEntryTypes?.includes(entryType);
}

type EntriesObserver = {
    disconnect: () => void;
    /** Hands the entries queued but not yet delivered to the callback right away; delivery itself can trail the frame by 100 ms or more. */
    flush: () => void;
};

/** Observes one entry type from now on, or returns undefined when the browser does not report that type. */
function observeEntries(entryType: string, onEntries: (entries: PerformanceEntry[]) => void, options: {durationThreshold?: number} = {}): EntriesObserver | undefined {
    if (!isEntryTypeSupported(entryType)) {
        return undefined;
    }
    const observer = new PerformanceObserver((list) => onEntries(list.getEntries()));
    const init: PerformanceObserverInit & {durationThreshold?: number} = {type: entryType, ...options};
    observer.observe(init);
    return {
        disconnect: () => observer.disconnect(),
        flush: () => {
            const entries = observer.takeRecords();
            if (entries.length > 0) {
                onEntries(entries);
            }
        },
    };
}

export {isEntryTypeSupported, observeEntries, readEntryNumber, readEntryString, readPaintedAt};
export type {EntriesObserver};
