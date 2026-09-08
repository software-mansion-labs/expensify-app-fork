import type {MFARegistrationStateSnapshot} from '@components/MultifactorAuthentication/observability/trackMFAFlowOutcome';

import readOnyxValueOnce from '@libs/MultifactorAuthentication/shared/readOnyxValueOnce';

import {getDeviceBiometricsOnyxKey} from '@userActions/MultifactorAuthentication';

import ONYXKEYS from '@src/ONYXKEYS';

import {mfaCredentialIDsSelector} from '@selectors/Account';

import {areLocalCredentialsKnownToServer} from './operations';

/**
 * Builds the account/device registration snapshot used for flow-boundary routing decisions and
 * telemetry. This is the one non-React implementation, shared by the provider's start-of-flow read
 * and the finalize-outcome actor's end-of-flow read, so the two cannot drift into separate snapshots
 * of the same signals (see the "keep both implementations aligned" comment on the platform-resolved
 * `areLocalCredentialsKnownToServer`).
 */
async function captureRegistrationState(accountID: number, signal?: AbortSignal): Promise<MFARegistrationStateSnapshot> {
    const [hasLocalCredentials, account, deviceBiometrics] = await Promise.all([
        areLocalCredentialsKnownToServer(accountID, signal),
        readOnyxValueOnce(ONYXKEYS.ACCOUNT, signal),
        readOnyxValueOnce(getDeviceBiometricsOnyxKey(accountID), signal),
    ]);
    return {
        hasServerCredentials: (mfaCredentialIDsSelector(account) ?? []).length > 0,
        hasLocalCredentials,
        hasEverAcceptedSoftPrompt: deviceBiometrics?.hasAcceptedSoftPrompt ?? false,
    };
}

export default captureRegistrationState;
