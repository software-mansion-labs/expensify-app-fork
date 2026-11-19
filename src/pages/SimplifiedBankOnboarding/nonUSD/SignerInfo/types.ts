/**
 * Types of the signer sub pages. The name and job title pages serve two forms: the signer step of the onboarding and the
 * page that an invited director opens, so the page that renders them passes the form they write to and the values that
 * it resolved.
 */
import type StepRequestSubPageProps from '@pages/SimplifiedBankOnboarding/requests/types';
import type {SignerValues} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDSigner';
import type ResolvedValuesProps from '@pages/SimplifiedBankOnboarding/values/types';

import type ONYXKEYS from '@src/ONYXKEYS';

type SignerFormID = typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM;

type SignerDetailsSubPageProps = StepRequestSubPageProps &
    ResolvedValuesProps<SignerValues> & {
        /** The form that the sub page writes to */
        formID: SignerFormID;

        /** Whether the form skips the name page, because the owner step already collected the name */
        isNamePageSkipped: boolean;
    };

export type {SignerFormID, SignerDetailsSubPageProps};
