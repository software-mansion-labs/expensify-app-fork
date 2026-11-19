/**
 * Removes the entry of a tracked request once the step that sent it has read the result.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

function removeStepRequest(requestID: string) {
    Onyx.merge(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {[requestID]: null});
}

export default removeStepRequest;
