import {useCallback, useMemo} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import type {MultifactorAuthenticationScenario} from '@components/MultifactorAuthentication/config/types';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useOnyx from '@hooks/useOnyx';
import type {AuthenticationChallenge, RegistrationChallenge, SignedChallenge} from '@libs/MultifactorAuthentication/Biometrics/ED25519/types';
import type {AuthTypeInfo, MultifactorAuthenticationReason, PasskeyRegistrationResponse} from '@libs/MultifactorAuthentication/Biometrics/types';
import {PASSKEY_AUTH_TYPE} from '@libs/MultifactorAuthentication/Passkeys/VALUES';
import {buildCreationOptions, buildRequestOptions, createPasskey, getPasskeyAssertion, isWebAuthnSupported} from '@libs/MultifactorAuthentication/Passkeys/WebAuthn';
import normalizeWebAuthnError from '@libs/MultifactorAuthentication/Passkeys/WebAuthn/errors';
import {addLocalPasskeyCredential, deleteLocalPasskeyCredentials, getPasskeyOnyxKey, reconcileLocalPasskeysWithBackend} from '@userActions/Passkey';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Account} from '@src/types/onyx';
import type {PasskeyCredential} from '@src/types/onyx/LocalPasskeyCredentialsEntry';

type PasskeyRegisterResult =
    | {
          success: true;
          reason: MultifactorAuthenticationReason;
          registrationResponse: PasskeyRegistrationResponse;
          credentialId: string;
          transports?: string[];
          authenticationMethod: AuthTypeInfo;
      }
    | {
          success: false;
          reason: MultifactorAuthenticationReason;
      };

type AuthorizeParams<T extends MultifactorAuthenticationScenario> = {
    scenario: T;
    challenge: AuthenticationChallenge;
};

type AuthorizeResultSuccess = {
    success: true;
    reason: MultifactorAuthenticationReason;
    signedChallenge: SignedChallenge;
    authenticationMethod: AuthTypeInfo;
};

type AuthorizeResultFailure = {
    success: false;
    reason: MultifactorAuthenticationReason;
};

type AuthorizeResult = AuthorizeResultSuccess | AuthorizeResultFailure;

type UsePasskeysBiometricsReturn = {
    serverHasAnyCredentials: boolean;
    serverKnownCredentialIDs: string[];
    doesDeviceSupportBiometrics: () => boolean;
    hasLocalCredentials: () => Promise<boolean>;
    areLocalCredentialsKnownToServer: () => Promise<boolean>;
    register: (challenge: RegistrationChallenge, onResult: (result: PasskeyRegisterResult) => Promise<void> | void) => Promise<void>;
    authorize: <T extends MultifactorAuthenticationScenario>(params: AuthorizeParams<T>, onResult: (result: AuthorizeResult) => Promise<void> | void) => Promise<void>;
    resetKeysForAccount: () => Promise<void>;
};

function getMultifactorAuthenticationPublicKeyIDs(data: OnyxEntry<Account>) {
    return data?.multifactorAuthenticationPublicKeyIDs;
}

function usePasskeysBiometrics(): UsePasskeysBiometricsReturn {
    const {accountID} = useCurrentUserPersonalDetails();
    const accountIDStr = String(accountID);

    const [multifactorAuthenticationPublicKeyIDs] = useOnyx(ONYXKEYS.ACCOUNT, {selector: getMultifactorAuthenticationPublicKeyIDs, canBeMissing: true});
    const serverKnownCredentialIDs = useMemo(() => multifactorAuthenticationPublicKeyIDs ?? [], [multifactorAuthenticationPublicKeyIDs]);
    const serverHasAnyCredentials = serverKnownCredentialIDs.length > 0;

    const [localCredentials] = useOnyx(getPasskeyOnyxKey(accountIDStr), {canBeMissing: true});

    const authType = useMemo(
        () => ({
            code: PASSKEY_AUTH_TYPE.CODE as AuthTypeInfo['code'],
            name: PASSKEY_AUTH_TYPE.NAME as AuthTypeInfo['name'],
            marqetaValue: PASSKEY_AUTH_TYPE.MARQETA_VALUE as AuthTypeInfo['marqetaValue'],
        }),
        [],
    );

    const getLocalCredentialIds = useCallback((): string[] => {
        if (!localCredentials) {
            return [];
        }
        return localCredentials.map((c) => c.id);
    }, [localCredentials]);

    const doesDeviceSupportBiometrics = useCallback(() => {
        return isWebAuthnSupported();
    }, []);

    const hasLocalCredentials = useCallback(async () => {
        return getLocalCredentialIds().length > 0;
    }, [getLocalCredentialIds]);

    const areLocalCredentialsKnownToServer = useCallback(async () => {
        const localIds = getLocalCredentialIds();
        if (localIds.length === 0) {
            return false;
        }
        return localIds.some((id) => serverKnownCredentialIDs.includes(id));
    }, [getLocalCredentialIds, serverKnownCredentialIDs]);

    const resetKeysForAccount = useCallback(async () => {
        deleteLocalPasskeyCredentials(accountIDStr);
    }, [accountIDStr]);

    const register = useCallback(
        async (challenge: RegistrationChallenge, onResult: (result: PasskeyRegisterResult) => Promise<void> | void) => {
            try {
                const options = buildCreationOptions(challenge);
                const registrationResponse = await createPasskey(options);

                const credentialId = registrationResponse.rawId;

                const credential: PasskeyCredential = {
                    id: credentialId,
                    type: CONST.PASSKEY_CREDENTIAL_TYPE,
                };

                addLocalPasskeyCredential({userId: accountIDStr, credential, existingCredentials: localCredentials ?? null});

                await onResult({
                    success: true,
                    reason: CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.REGISTRATION_COMPLETE,
                    registrationResponse,
                    credentialId,
                    authenticationMethod: authType,
                });
            } catch (error) {
                const reason = normalizeWebAuthnError(error);
                onResult({
                    success: false,
                    reason,
                });
            }
        },
        [accountIDStr, authType, localCredentials],
    );

    const authorize = useCallback(
        async <T extends MultifactorAuthenticationScenario>(params: AuthorizeParams<T>, onResult: (result: AuthorizeResult) => Promise<void> | void) => {
            try {
                const {challenge} = params;

                const backendCredentials = challenge.allowCredentials?.map((cred) => ({id: cred.id, type: cred.type as typeof CONST.PASSKEY_CREDENTIAL_TYPE})) ?? [];

                const reconciledCredentials = reconcileLocalPasskeysWithBackend({
                    userId: accountIDStr,
                    backendCredentials,
                    localCredentials: localCredentials ?? null,
                });

                const reconciledIds = reconciledCredentials.map((c) => c.id);

                if (reconciledIds.length === 0) {
                    onResult({
                        success: false,
                        reason: CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.NO_CREDENTIAL_FOUND,
                    });
                    return;
                }

                const options = buildRequestOptions(challenge, reconciledIds);
                const signedChallenge = await getPasskeyAssertion(options);

                await onResult({
                    success: true,
                    reason: CONST.MULTIFACTOR_AUTHENTICATION.REASON.WEBAUTHN.REGISTRATION_COMPLETE,
                    signedChallenge,
                    authenticationMethod: authType,
                });
            } catch (error) {
                const reason = normalizeWebAuthnError(error);
                onResult({
                    success: false,
                    reason,
                });
            }
        },
        [accountIDStr, authType, localCredentials],
    );

    return {
        serverHasAnyCredentials,
        serverKnownCredentialIDs,
        doesDeviceSupportBiometrics,
        hasLocalCredentials,
        areLocalCredentialsKnownToServer,
        register,
        authorize,
        resetKeysForAccount,
    };
}

export default usePasskeysBiometrics;
export type {PasskeyRegisterResult, AuthorizeParams, AuthorizeResult, UsePasskeysBiometricsReturn};
