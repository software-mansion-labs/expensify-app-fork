import type {OnyxMergeInput} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxCollectionKey, OnyxKey} from '@src/ONYXKEYS';

function resetDebugDetailsDraftForm() {
    void Onyx.set(ONYXKEYS.FORMS.DEBUG_DETAILS_FORM_DRAFT, null);
}

function setDebugData<TKey extends OnyxKey | `${OnyxCollectionKey}${string}`>(onyxKey: TKey, onyxValue: OnyxMergeInput<TKey>) {
    void Onyx.set(onyxKey, onyxValue);
}

function mergeDebugData<TKey extends OnyxKey | `${OnyxCollectionKey}${string}`>(onyxKey: TKey, onyxValue: OnyxMergeInput<TKey>) {
    void Onyx.merge(onyxKey, onyxValue);
}

export default {
    resetDebugDetailsDraftForm,
    setDebugData,
    mergeDebugData,
};
