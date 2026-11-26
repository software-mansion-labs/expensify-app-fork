/**
 * The request of an invited director: their name and job title from the signer form. The draft of that form is cleared
 * once the server saved it, so a later invitation starts empty.
 */
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import buildDirectorRequest from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/directorRequest';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import getInvitedSignerAnswers from './invitedSignerAnswers';

const invitedSignerDetailsRequest: OnboardingRequest = {
    name: 'enterSignerInfo.signer.saveDetails',
    build: (data) => ({
        ...buildDirectorRequest(data.bankAccount, getInvitedSignerAnswers(data)),
        onyxData: {
            successData: [{onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT, value: null}],
        },
    }),
};

export default invitedSignerDetailsRequest;
