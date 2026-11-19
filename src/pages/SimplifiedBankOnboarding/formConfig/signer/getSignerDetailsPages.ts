import type {ConfirmationPageConfig, FormPageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import type {SignerDetailsInput} from './types';

import getSignerConfirmationPage from './getSignerConfirmationPage';
import getSignerJobTitlePage from './getSignerJobTitlePage';
import getSignerNamePage from './getSignerNamePage';

type SignerDetailsPages = {
    /** The name page, when the name is asked for, and the job title page */
    formPages: FormPageConfig[];
    confirmation: ConfirmationPageConfig;
};

/**
 * The pages that collect the details of a signing director. The confirmation is returned on its own, so the caller can
 * attach the request that saves the details, which differs between the flow of the user and the page of an invited director.
 */
function getSignerDetailsPages(input: SignerDetailsInput): SignerDetailsPages {
    const {pageIDs, fullName, jobTitle, shouldAskForName, translate} = input;
    const namePages = shouldAskForName ? [getSignerNamePage(pageIDs.name, fullName, translate)] : [];
    return {
        formPages: [...namePages, getSignerJobTitlePage(pageIDs.jobTitle, jobTitle, translate)],
        confirmation: getSignerConfirmationPage(input),
    };
}

export default getSignerDetailsPages;
export type {SignerDetailsPages};
