/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import type {RequestName} from './REQUEST_NAMES';

/** Drops the result of a request, for example the error of a page that the user leaves */
function clearRequestState(name: RequestName): Promise<void> {
    return Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {[name]: null});
}

export default clearRequestState;
