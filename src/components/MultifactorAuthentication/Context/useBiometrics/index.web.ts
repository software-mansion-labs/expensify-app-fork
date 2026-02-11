import {useCallback, useMemo} from 'react';
import type {MultifactorAuthenticationScenario} from '@components/MultifactorAuthentication/config/types';
import usePasskeysBiometrics from '@components/MultifactorAuthentication/Context/usePasskeysBiometrics';
import type {MultifactorAuthenticationReason} from '@libs/MultifactorAuthentication/Biometrics/types';
import CONST from '@src/CONST';
import type {UseBiometricsReturn} from './types';

function useBiometrics(): UseBiometricsReturn {
    const passkeys = usePasskeysBiometrics();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const getDeviceUnsupportedReason = useCallback((scenario: MultifactorAuthenticationScenario): MultifactorAuthenticationReason => {
        return CONST.MULTIFACTOR_AUTHENTICATION.REASON.GENERIC.UNSUPPORTED_DEVICE;
    }, []);

    return useMemo(
        () => ({
            serverHasAnyCredentials: passkeys.serverHasAnyCredentials,
            serverKnownCredentialIDs: passkeys.serverKnownCredentialIDs,
            doesDeviceSupportBiometrics: passkeys.doesDeviceSupportBiometrics,
            hasLocalCredentials: passkeys.hasLocalCredentials,
            areLocalCredentialsKnownToServer: passkeys.areLocalCredentialsKnownToServer,
            register: passkeys.register,
            authorize: passkeys.authorize,
            resetKeysForAccount: passkeys.resetKeysForAccount,
            promptName: CONST.MULTIFACTOR_AUTHENTICATION.PROMPT.ENABLE_PASSKEYS,
            requiresSoftPromptForReturningUsers: false,
            reRegistrationReason: CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.NO_CREDENTIAL_FOUND,
            getDeviceUnsupportedReason,
        }),
        [
            passkeys.serverHasAnyCredentials,
            passkeys.serverKnownCredentialIDs,
            passkeys.doesDeviceSupportBiometrics,
            passkeys.hasLocalCredentials,
            passkeys.areLocalCredentialsKnownToServer,
            passkeys.register,
            passkeys.authorize,
            passkeys.resetKeysForAccount,
            getDeviceUnsupportedReason,
        ],
    );
}

export default useBiometrics;
export type {UseBiometricsReturn};
