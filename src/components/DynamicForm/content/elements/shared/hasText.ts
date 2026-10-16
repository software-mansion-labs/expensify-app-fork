function hasText(text: unknown): text is string {
    return typeof text === 'string' && text !== '';
}

export default hasText;
