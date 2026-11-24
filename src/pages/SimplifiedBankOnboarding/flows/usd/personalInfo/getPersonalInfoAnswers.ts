/** The answers of the USD personal info step: the draft value, then the saved one, then an empty text (BC-08) */
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

type PersonalInfoAnswers = {
    firstName: string;
    lastName: string;
    dob: string;
    ssnLast4: string;
};

function getPersonalInfoAnswers({draft, account}: FlowData): PersonalInfoAnswers {
    const achData = account?.achData;

    return {
        firstName: draft.firstName ?? achData?.firstName ?? '',
        lastName: draft.lastName ?? achData?.lastName ?? '',
        dob: draft.dob ?? achData?.dob ?? '',
        ssnLast4: draft.ssnLast4 ?? achData?.ssnLast4 ?? '',
    };
}

export default getPersonalInfoAnswers;
