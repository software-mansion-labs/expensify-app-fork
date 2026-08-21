import markAllMessagesAsRead from '@libs/actions/Report/MarkAllMessageAsRead';
import KeyboardShortcut from '@libs/KeyboardShortcut';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {useEffect} from 'react';
import Onyx from 'react-native-onyx';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

function MarkAllMessagesAsReadHandler() {
    useEffect(() => {
        const shortcutConfig = CONST.KEYBOARD_SHORTCUTS.MARK_ALL_MESSAGES_AS_READ;
        const unsubscribe = KeyboardShortcut.subscribe(
            shortcutConfig.shortcutKey,
            () => {
                // Lazy-Onyx POC: a standing collection-root subscription mirrored into a ref would keep
                // the whole RNVP collection hydrated for the lifetime of the app just in case this
                // shortcut fires. Instead, this explicit user action pays for one hydration on demand
                // (a no-op when the collection is already hydrated) and reads the then-complete cache.
                Onyx.hydrate(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS).then(() => markAllMessagesAsRead(OnyxUtils.getCachedCollection(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS)));
            },
            shortcutConfig.descriptionKey,
            shortcutConfig.modifiers,
            true,
        );

        return () => unsubscribe();
        // Rule disabled because this effect is only for component did mount & will component unmount lifecycle event
    }, []);

    return null;
}

export default MarkAllMessagesAsReadHandler;
