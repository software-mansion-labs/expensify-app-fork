import type suppressNextEscapeKeyupType from '@components/MultifactorAuthentication/useMFACancelOnEscape/suppressNextEscapeKeyup';

// Jest resolves the native variant by default, so each variant is loaded by its explicit file name.
const suppressNextEscapeKeyupWeb = jest.requireActual<{default: typeof suppressNextEscapeKeyupType}>(
    '@components/MultifactorAuthentication/useMFACancelOnEscape/suppressNextEscapeKeyup/index.ts',
).default;
const suppressNextEscapeKeyupNative = jest.requireActual<{default: typeof suppressNextEscapeKeyupType}>(
    '@components/MultifactorAuthentication/useMFACancelOnEscape/suppressNextEscapeKeyup/index.native.ts',
).default;

function dispatchKeyup(key: string): jest.SpyInstance {
    const event = new KeyboardEvent('keyup', {key, cancelable: true, bubbles: true});
    const stopImmediatePropagationSpy = jest.spyOn(event, 'stopImmediatePropagation');
    document.dispatchEvent(event);
    return stopImmediatePropagationSpy;
}

describe('suppressNextEscapeKeyup', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('web', () => {
        it('swallows the matching Escape keyup so the confirmation modal does not close immediately', () => {
            suppressNextEscapeKeyupWeb();

            expect(dispatchKeyup('Escape')).toHaveBeenCalledTimes(1);
        });

        it('lets a non-Escape keyup that races in propagate', () => {
            suppressNextEscapeKeyupWeb();

            expect(dispatchKeyup('Enter')).not.toHaveBeenCalled();
        });

        it('removes itself after one keyup, so a later Escape is not swallowed', () => {
            suppressNextEscapeKeyupWeb();
            dispatchKeyup('Escape');

            expect(dispatchKeyup('Escape')).not.toHaveBeenCalled();
        });

        it('removes itself even when the first keyup is not Escape', () => {
            suppressNextEscapeKeyupWeb();
            dispatchKeyup('Enter');

            expect(dispatchKeyup('Escape')).not.toHaveBeenCalled();
        });

        it('arms one listener for a held Escape, so only its release is swallowed', () => {
            // Key repeat sends a keydown, and so a request, several times before the single release.
            suppressNextEscapeKeyupWeb();
            suppressNextEscapeKeyupWeb();
            suppressNextEscapeKeyupWeb();

            expect(dispatchKeyup('Escape')).toHaveBeenCalledTimes(1);
            expect(dispatchKeyup('Escape')).not.toHaveBeenCalled();
        });
    });

    describe('native', () => {
        it('never touches document, which does not exist there', () => {
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

            suppressNextEscapeKeyupNative();

            expect(addEventListenerSpy).not.toHaveBeenCalled();
            expect(dispatchKeyup('Escape')).not.toHaveBeenCalled();
        });
    });
});
