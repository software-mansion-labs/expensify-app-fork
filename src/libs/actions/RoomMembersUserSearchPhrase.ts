import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';

function clearUserSearchPhrase() {
    void Onyx.merge(ONYXKEYS.ROOM_MEMBERS_USER_SEARCH_PHRASE, '');
}

/**
 * Persists user search phrase from the search input across the screens.
 */
function updateUserSearchPhrase(value: string) {
    void Onyx.merge(ONYXKEYS.ROOM_MEMBERS_USER_SEARCH_PHRASE, value);
}

export {clearUserSearchPhrase, updateUserSearchPhrase};
