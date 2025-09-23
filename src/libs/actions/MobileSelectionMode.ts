import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';

const turnOnMobileSelectionMode = () => {
    void Onyx.merge(ONYXKEYS.MOBILE_SELECTION_MODE, true);
};

const turnOffMobileSelectionMode = () => {
    void Onyx.merge(ONYXKEYS.MOBILE_SELECTION_MODE, false);
};

export {turnOnMobileSelectionMode, turnOffMobileSelectionMode};
