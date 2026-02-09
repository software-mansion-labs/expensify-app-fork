import {useCallback, useMemo} from 'react';
import {MULTIFACTOR_AUTHENTICATION_SCENARIO_CONFIG} from '@components/MultifactorAuthentication/config';
import type {MultifactorAuthenticationScenario} from '@components/MultifactorAuthentication/config/types';
import type {MultifactorAuthenticationReason} from '@libs/MultifactorAuthentication/Biometrics/types';
import VALUES from '@libs/MultifactorAuthentication/Biometrics/VALUES';
import CONST from '@src/CONST';
import useNativeBiometrics from '@components/MultifactorAuthentication/Context/useNativeBiometrics';
import type {UseBiometricsReturn} from './types';

function useBiometrics(): UseBiometricsReturn {
    const nativeBiometrics = useNativeBiometrics();

    const getDeviceUnsupportedReason = useCallback((scenario: MultifactorAuthenticationScenario): MultifactorAuthenticationReason => {
        const {allowedAuthenticationMethods = [] as string[]} = MULTIFACTOR_AUTHENTICATION_SCENARIO_CONFIG[scenario] ?? {};

        if (allowedAuthenticationMethods.includes(CONST.MULTIFACTOR_AUTHENTICATION.TYPE.BIOMETRICS)) {
            return CONST.MULTIFACTOR_AUTHENTICATION.REASON.GENERIC.NO_ELIGIBLE_METHODS;
        }

        return CONST.MULTIFACTOR_AUTHENTICATION.REASON.GENERIC.UNSUPPORTED_DEVICE;
    }, []);

    return useMemo(
        () => ({
            serverHasAnyCredentials: nativeBiometrics.serverHasAnyCredentials,
            serverKnownCredentialIDs: nativeBiometrics.serverKnownCredentialIDs,
            doesDeviceSupportBiometrics: nativeBiometrics.doesDeviceSupportBiometrics,
            hasLocalCredentials: nativeBiometrics.hasLocalCredentials,
            areLocalCredentialsKnownToServer: nativeBiometrics.areLocalCredentialsKnownToServer,
            register: nativeBiometrics.register,
            authorize: nativeBiometrics.authorize,
            resetKeysForAccount: nativeBiometrics.resetKeysForAccount,
            promptName: CONST.MULTIFACTOR_AUTHENTICATION.PROMPT.ENABLE_BIOMETRICS,
            requiresSoftPromptForReturningUsers: true,
            reRegistrationReason: VALUES.REASON.KEYSTORE.REGISTRATION_REQUIRED,
            getDeviceUnsupportedReason,
        }),
        [
            nativeBiometrics.serverHasAnyCredentials,
            nativeBiometrics.serverKnownCredentialIDs,
            nativeBiometrics.doesDeviceSupportBiometrics,
            nativeBiometrics.hasLocalCredentials,
            nativeBiometrics.areLocalCredentialsKnownToServer,
            nativeBiometrics.register,
            nativeBiometrics.authorize,
            nativeBiometrics.resetKeysForAccount,
            getDeviceUnsupportedReason,
        ],
    );
}

export default useBiometrics;
export type {UseBiometricsReturn};
