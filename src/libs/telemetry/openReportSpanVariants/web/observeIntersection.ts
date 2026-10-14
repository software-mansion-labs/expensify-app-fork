/** IntersectionObserver computes intersections in the rendering step after layout, so the first visible entry marks the frame that shows the element. */
function observeIntersection(element: Element, onVisible: (time: number) => void) {
    if (typeof IntersectionObserver === 'undefined') {
        return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
        const entry = entries.find((candidate) => candidate.isIntersecting);
        if (!entry) {
            return;
        }
        observer.disconnect();
        onVisible(entry.time);
    });
    observer.observe(element);
    return () => observer.disconnect();
}

export default observeIntersection;
