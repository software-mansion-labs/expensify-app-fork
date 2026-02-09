import type {MultifactorAuthenticationScenario} from '@components/MultifactorAuthentication/config/types';
import type {AuthenticationChallenge, RegistrationChallenge, SignedChallenge} from '@libs/MultifactorAuthentication/Biometrics/ED25519/types';
import type {AuthTypeInfo, MultifactorAuthenticationReason, RegistrationResponseInfo} from '@libs/MultifactorAuthentication/Biometrics/types';

type BiometricRegisterResult =
    | {success: true; registrationResponse: RegistrationResponseInfo; authenticationMethod: AuthTypeInfo}
    | {success: false; reason: MultifactorAuthenticationReason};

type BiometricAuthorizeResult =
    | {
          success: true;
          reason: MultifactorAuthenticationReason;
          signedChallenge: SignedChallenge;
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

type UseBiometricsReturn = {
    /** Whether server has any registered credentials for this account */
    serverHasAnyCredentials: boolean;

    /** List of credential IDs known to server (from Onyx) */
    serverKnownCredentialIDs: string[];

    /** Check if device supports biometrics/passkeys */
    doesDeviceSupportBiometrics: () => boolean;

    /** Check if device has credentials stored locally */
    hasLocalCredentials: () => Promise<boolean>;

    /** Check if local credentials are known to server */
    areLocalCredentialsKnownToServer: () => Promise<boolean>;

    /** Register credentials on device */
    register: (challenge: RegistrationChallenge, onResult: (result: BiometricRegisterResult) => Promise<void> | void) => Promise<void>;

    /** Authorize using biometrics/passkeys */
    authorize: <T extends MultifactorAuthenticationScenario>(params: AuthorizeParams<T>, onResult: (result: BiometricAuthorizeResult) => Promise<void> | void) => Promise<void>;

    /** Reset credentials for account */
    resetKeysForAccount: () => Promise<void>;

    /** The prompt screen name to use for this platform */
    promptName: string;

    /** Whether returning users (already registered) need a soft prompt before authorization */
    requiresSoftPromptForReturningUsers: boolean;

    /** The reason string that indicates re-registration is needed during authorization */
    reRegistrationReason: MultifactorAuthenticationReason;

    /** Get the appropriate error reason when device doesn't support biometrics */
    getDeviceUnsupportedReason: (scenario: MultifactorAuthenticationScenario) => MultifactorAuthenticationReason;
};

export type {BiometricRegisterResult, BiometricAuthorizeResult, AuthorizeParams, UseBiometricsReturn};
