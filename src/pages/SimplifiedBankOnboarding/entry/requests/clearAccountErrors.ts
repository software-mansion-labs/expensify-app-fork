/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/** Dismisses the error that a failed write left on the account, which the entry page and the Payments page show */
function clearAccountErrors() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {errors: null});
}

export default clearAccountErrors;
