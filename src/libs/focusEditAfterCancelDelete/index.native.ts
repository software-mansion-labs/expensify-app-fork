import {InteractionManager} from 'react-native';
import type FocusEditAfterCancelDelete from './types';

const focusEditAfterCancelDelete: FocusEditAfterCancelDelete = (textInputRef) => {
    void InteractionManager.runAfterInteractions(() => textInputRef?.focus());
};

export default focusEditAfterCancelDelete;
