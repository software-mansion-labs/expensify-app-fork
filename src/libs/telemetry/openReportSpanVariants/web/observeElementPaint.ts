import type {EntriesObserver} from './performanceEntries';

import {observeEntries, readEntryString, readPaintedAt} from './performanceEntries';

const ELEMENT_TIMING_ATTRIBUTE = 'elementtiming';

function hasOwnText(element: Element) {
    return Array.from(element.childNodes).some((child) => child.nodeType === Node.TEXT_NODE && !!child.textContent?.trim());
}

/** Element Timing attributes text to its nearest block ancestor, and React Native Web renders Text inline, so tag both. */
function tagTextElements(root: Element, identifier: string) {
    for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
        if (!hasOwnText(element)) {
            continue;
        }
        element.setAttribute(ELEMENT_TIMING_ATTRIBUTE, identifier);
        element.parentElement?.setAttribute(ELEMENT_TIMING_ATTRIBUTE, identifier);
    }
}

/** Reports when every text paint under the container reached the screen, including rows mounted after it. */
function observeElementPaint(container: HTMLElement, identifier: string, onPaint: (paintedAt: number) => void): EntriesObserver | undefined {
    const entriesObserver = observeEntries('element', (entries) => {
        for (const entry of entries) {
            if (readEntryString(entry, 'identifier') !== identifier) {
                continue;
            }
            onPaint(readPaintedAt(entry));
        }
    });
    if (!entriesObserver) {
        return undefined;
    }
    tagTextElements(container, identifier);
    const mutationObserver = new MutationObserver((records) => {
        for (const record of records) {
            for (const node of Array.from(record.addedNodes)) {
                if (node instanceof Element) {
                    tagTextElements(node, identifier);
                }
            }
        }
    });
    mutationObserver.observe(container, {childList: true, subtree: true});
    return {
        disconnect: () => {
            entriesObserver.disconnect();
            mutationObserver.disconnect();
        },
        flush: entriesObserver.flush,
    };
}

export default observeElementPaint;
export {ELEMENT_TIMING_ATTRIBUTE};
