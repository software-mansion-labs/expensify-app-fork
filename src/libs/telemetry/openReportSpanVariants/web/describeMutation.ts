function describeElement(element: Element): string {
    const testID = element.getAttribute('data-testid');
    const label = element.getAttribute('aria-label');
    return `${element.tagName.toLowerCase()}${testID ? `[data-testid=${testID}]` : ''}${label ? `[aria-label=${label}]` : ''}`;
}

/** Names the mutated node and its nearest ancestor with a testID, so a span can say what kept the DOM busy. */
function describeMutation(record: MutationRecord): string {
    const {target} = record;
    const element = target instanceof Element ? target : target.parentElement;
    if (!element) {
        return `${record.type} ${target.nodeName}`;
    }
    const owner = element.parentElement?.closest('[data-testid]');
    return `${record.type}${record.attributeName ? `(${record.attributeName})` : ''} ${describeElement(element)}${owner ? ` in ${describeElement(owner)}` : ''}`;
}

export default describeMutation;
