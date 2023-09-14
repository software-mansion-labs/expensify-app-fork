import * as OnyxCommon from './OnyxCommon';

type WalletAdditionalDetailsQuestions = {
    prompt: string;
    type: string;
    answer: string[];
};

type WalletAdditionalDetails = {
    /** Questions returned by Idology */
    questions?: WalletAdditionalDetailsQuestions;

    /** ExpectID ID number related to those questions */
    idNumber?: string;

    /** Error code to determine additional behavior */
    errorCode?: string;

    /** Which field needs attention? */
    errorFields?: OnyxCommon.ErrorFields;
    isLoading?: boolean;
    errors?: OnyxCommon.Errors;
    additionalErrorMessage?: string;
};

export type {WalletAdditionalDetails, WalletAdditionalDetailsQuestions};
