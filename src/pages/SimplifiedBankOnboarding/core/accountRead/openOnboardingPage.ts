import type {SetupType, USDStep} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {runRequest} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import type {RequestOnyxKey, RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import Onyx from 'react-native-onyx';

type OpenOnboardingPageParams = {
    /** The page names the workspace or the bank account. With the bank account, the server picks the step. */
    policyID?: string;
    bankAccountID?: number;

    /** The step that the client wants to show. The server answers with it when the account already reached that step. */
    stepToOpen?: USDStep | '';
    subStep?: SetupType | '';
    localCurrentStep?: USDStep | '';
};

/** Raises account.isLoading while a read runs. The entry page takes it for its own loading. */
function getAccountLoadingData(): OnyxData<RequestOnyxKey> {
    return {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: true}}],
        finallyData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: false}}],
    };
}

/** OpenOnboardingPage, the read of the account of a workspace or a bank account. It raises account.isLoading while it runs. */
function openOnboardingPage({policyID, bankAccountID, stepToOpen = '', subStep = '', localCurrentStep = ''}: OpenOnboardingPageParams): Promise<RequestOutcome> {
    return runRequest({
        name: 'core.account.open',
        scope: {policyID, bankAccountID},
        type: 'read',
        command: READ_COMMANDS.OPEN_ONBOARDING_PAGE,
        params: {policyID, bankAccountID, stepToOpen, subStep, localCurrentStep},
        onyxData: getAccountLoadingData(),
    });
}

export default openOnboardingPage;
export {getAccountLoadingData};
export type {OpenOnboardingPageParams};
