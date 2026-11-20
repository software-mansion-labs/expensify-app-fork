import type {ConfirmationPageConfig, ConfirmationRow} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import type {SignerDetailsInput} from './types';

/** The name row is left out when the name was not asked for, because the user could not edit it here */
function getSignerConfirmationPage({pageIDs, fullName, jobTitle, shouldAskForName, isConfirmationComplete, translate}: SignerDetailsInput): ConfirmationPageConfig {
    const nameRows: ConfirmationRow[] = shouldAskForName ? [{id: 'legalName', label: translate('signerInfoStep.legalName'), value: fullName, editPageID: pageIDs.name}] : [];
    return {
        kind: 'confirmation',
        id: pageIDs.confirmation,
        isComplete: isConfirmationComplete,
        title: translate('signerInfoStep.letsDoubleCheck'),
        rows: [...nameRows, {id: 'jobTitle', label: translate('signerInfoStep.jobTitle'), value: jobTitle, editPageID: pageIDs.jobTitle}],
    };
}

export default getSignerConfirmationPage;
