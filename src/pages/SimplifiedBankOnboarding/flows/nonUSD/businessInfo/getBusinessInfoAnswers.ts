/** The answers of the NonUSD business info step: the draft value, then the one that the global provider saved (BC-08) */
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

type BusinessInfoAnswers = {
    companyName: string;
    businessType: string;
};

function getBusinessInfoAnswers({draft, account}: FlowData): BusinessInfoAnswers {
    const corpay = account?.achData?.corpay;

    return {
        companyName: draft.companyName ?? corpay?.companyName ?? '',
        businessType: draft.businessType ?? corpay?.businessType ?? '',
    };
}

export default getBusinessInfoAnswers;
