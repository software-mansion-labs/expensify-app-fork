/**
 * Types of the signer sub pages. The name and job title pages serve two forms: the signer step of the onboarding and the
 * page that an invited director opens, so the page that renders them passes the form they write to.
 */
import type {SubPageProps} from '@hooks/useSubPage/types';

import type ONYXKEYS from '@src/ONYXKEYS';

type SignerFormID = typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM;

type SignerDetailsSubPageProps = SubPageProps & {
    /** The form that the sub page writes to */
    formID: SignerFormID;
};

export type {SignerFormID, SignerDetailsSubPageProps};
