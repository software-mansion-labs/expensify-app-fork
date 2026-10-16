let isArmed = false;

function suppressEscapeKeyup(event: KeyboardEvent) {
    document.removeEventListener('keyup', suppressEscapeKeyup, true);
    isArmed = false;
    if (event.key === 'Escape') {
        event.stopImmediatePropagation();
    }
}

/**
 * The cancel-confirmation modal closes on an Escape `keyup`, so the `keyup` of the same press that opens
 * it would close it straight away. Swallows that one `keyup` through a one-shot capture-phase listener on
 * `document`, which runs before the modal's own listener on `document.body`.
 *
 * Idempotent: a held Escape repeats `keydown` but releases once, so at most one listener is armed.
 * Otherwise the first listener's `stopImmediatePropagation` would keep the rest from removing themselves.
 */
function suppressNextEscapeKeyup() {
    if (isArmed) {
        return;
    }
    isArmed = true;
    document.addEventListener('keyup', suppressEscapeKeyup, true);
}

export default suppressNextEscapeKeyup;
