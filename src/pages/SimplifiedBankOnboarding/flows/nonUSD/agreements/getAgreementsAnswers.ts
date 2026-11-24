/**
 * What the last request of the NonUSD flow sends: the agreements, as the draft value, then the saved one (BC-08), and
 * the two files. The docusign step collects the authorization form, but its answer lives here, next to the request
 * that sends both files. Only the draft holds files, the server keeps their names only.
 */
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

import type {FileObject} from '@src/types/utils/Attachment';

type AgreementsAnswers = {
    authorizedToBindClientToAgreement: boolean;
    agreeToTermsAndConditions: boolean;
    consentToPrivacyNotice: boolean;
    bankStatement: FileObject[];
    achAuthorizationForm: FileObject[];
};

function getAgreementsAnswers({draft, account}: FlowData): AgreementsAnswers {
    const corpay = account?.achData?.corpay;

    return {
        authorizedToBindClientToAgreement: draft.authorizedToBindClientToAgreement ?? corpay?.authorizedToBindClientToAgreement ?? false,
        agreeToTermsAndConditions: draft.agreeToTermsAndConditions ?? corpay?.agreeToTermsAndConditions ?? false,
        consentToPrivacyNotice: draft.consentToPrivacyNotice ?? corpay?.consentToPrivacyNotice ?? false,
        bankStatement: draft.bankStatement ?? [],
        achAuthorizationForm: draft.achAuthorizationForm ?? [],
    };
}

export default getAgreementsAnswers;
