import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';

function alertUser() {
    void Onyx.set(ONYXKEYS.UPDATE_REQUIRED, true);
}

export {
    // eslint-disable-next-line import/prefer-default-export
    alertUser,
};
