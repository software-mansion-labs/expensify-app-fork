function resolveAfter(delay: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
    });
}

function hide(): Promise<void> {
    const splash = document.getElementById('splash');

    if (splash) {
        splash.style.opacity = '0';
    }

        // eslint-disable-next-line @typescript-eslint/no-deprecated
    return resolveAfter(250).then(() => {
        if (!splash?.parentNode) {
            return;
        }
        splash.parentNode.removeChild(splash);
    });
}

export default {
    hide,
    logoSizeRatio: 1,
    navigationBarHeight: 0,
};