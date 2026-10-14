import {ELEMENT_TIMING_ATTRIBUTE} from './observeElementPaint';

/** Watches the whole document, leaving out the attributes the Element Timing variant writes itself. */
function observeDomMutations(onMutations: (records: MutationRecord[]) => void) {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
        return undefined;
    }
    const observer = new MutationObserver((records) => {
        const appRecords = records.filter((record) => record.attributeName !== ELEMENT_TIMING_ATTRIBUTE);
        if (appRecords.length > 0) {
            onMutations(appRecords);
        }
    });
    observer.observe(document.body, {subtree: true, childList: true, attributes: true, characterData: true});
    return () => observer.disconnect();
}

export default observeDomMutations;
