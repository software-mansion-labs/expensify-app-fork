/** The answers of the USD business info step: the draft value, then the saved one, then an empty text (BC-08) */
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

type BusinessInfoAnswers = {
    companyName: string;
    companyTaxID: string;
    incorporationType: string;
};

/** A text input shows an empty value while neither the user nor the server gave an answer */
function getTextAnswer(draftValue: string | undefined, serverValue: string | undefined): string {
    return draftValue ?? serverValue ?? '';
}

function getBusinessInfoAnswers({draft, account}: FlowData): BusinessInfoAnswers {
    const achData = account?.achData;

    return {
        companyName: getTextAnswer(draft.companyName, achData?.companyName),
        companyTaxID: getTextAnswer(draft.companyTaxID, achData?.companyTaxID),
        incorporationType: getTextAnswer(draft.incorporationType, achData?.incorporationType),
    };
}

export default getBusinessInfoAnswers;
