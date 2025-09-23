import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';

export default function setFullscreenVisibility(isVisible: boolean) {
    void Onyx.merge(ONYXKEYS.FULLSCREEN_VISIBILITY, isVisible);
}
