import type {NullishDeep, OnyxValue} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import type {OnyxFormDraftKey, OnyxFormKey} from '@src/ONYXKEYS';
import type * as OnyxCommon from '@src/types/onyx/OnyxCommon';

function setIsLoading(formID: OnyxFormKey, isLoading: boolean) {
    void Onyx.merge(formID, {isLoading});
}

function setErrors(formID: OnyxFormKey, errors: OnyxCommon.Errors) {
    void Onyx.merge(formID, {errors});
}

function setErrorFields(formID: OnyxFormKey, errorFields: OnyxCommon.ErrorFields) {
    void Onyx.merge(formID, {errorFields});
}

function clearErrors(formID: OnyxFormKey) {
    void Onyx.merge(formID, {errors: null});
}

function clearErrorFields(formID: OnyxFormKey) {
    void Onyx.merge(formID, {errorFields: null});
}

function setDraftValues(formID: OnyxFormKey, draftValues: NullishDeep<OnyxValue<OnyxFormDraftKey>>): Promise<void> {
    return Onyx.merge(`${formID}Draft`, draftValues ?? null);
}

function clearDraftValues(formID: OnyxFormKey) {
    void Onyx.set(`${formID}Draft`, null);
}

export {clearDraftValues, clearErrorFields, clearErrors, setDraftValues, setErrorFields, setErrors, setIsLoading};
