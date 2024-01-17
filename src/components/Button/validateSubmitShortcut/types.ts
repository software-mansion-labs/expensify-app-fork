import type {SyntheticEvent} from 'react';
import type {GestureResponderEvent} from 'react-native';

type ValidateSubmitShortcut = (isDisabled: boolean, isLoading: boolean, event?: GestureResponderEvent | KeyboardEvent | SyntheticEvent<Element, PointerEvent>) => boolean;

export default ValidateSubmitShortcut;
