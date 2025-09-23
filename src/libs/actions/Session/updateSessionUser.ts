import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';

export default function updateSessionUser(accountID?: number, email?: string) {
    void Onyx.merge(ONYXKEYS.SESSION, {accountID, email});
}
