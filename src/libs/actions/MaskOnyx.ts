import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';

function setShouldMaskOnyxState(shouldMask: boolean) {
    void Onyx.set(ONYXKEYS.SHOULD_MASK_ONYX_STATE, shouldMask);
}

export {
    // eslint-disable-next-line import/prefer-default-export
    setShouldMaskOnyxState,
};
