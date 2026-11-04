import type {MultifactorAuthenticationScenarioParameters} from '@components/MultifactorAuthentication/config/types';

import {makeRequestWithSideEffects} from '@libs/API';
import type {DenyTransactionParams, RevokeMultifactorAuthenticationCredentialsParams} from '@libs/API/parameters';
import {SIDE_EFFECT_REQUEST_COMMANDS} from '@libs/API/types';
import HttpsError from '@libs/Errors/HttpsError';
import Log from '@libs/Log';
import type {AuthenticationChallenge, RegistrationChallenge} from '@libs/MultifactorAuthentication/shared/challengeTypes';
import {isAuthenticationChallenge, isRegistrationChallenge, parseHttpResponse} from '@libs/MultifactorAuthentication/shared/helpers';
import type {MultifactorAuthenticationReason} from '@libs/MultifactorAuthentication/shared/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {LocallyProcessed3DSChallengeReviews} from '@src/types/onyx';

import type {OnyxEntry, OnyxUpdate} from 'react-native-onyx';

// These functions use makeRequestWithSideEffects because challenge data must be returned immediately
// for security and timing requirements (see detailed explanation below)
import Onyx from 'react-native-onyx';

/**
 * These subscriptions keep ONYXKEYS.LOCALLY_PROCESSED_3DS_TRANSACTION_REVIEWS tidy as values within it are no longer needed
 */

let locallyProcessed3DSTransactionReviews: OnyxEntry<LocallyProcessed3DSChallengeReviews> = {};

Onyx.connectWithoutView({
    key: ONYXKEYS.LOCALLY_PROCESSED_3DS_TRANSACTION_REVIEWS,
    callback: (storedLocallyProcessed3DSTransactionReviews) => {
        locallyProcessed3DSTransactionReviews = storedLocallyProcessed3DSTransactionReviews;
    },
});

// Clean up list of locally-reviewed transactions when they are removed from queue by the server
Onyx.connectWithoutView({
    key: ONYXKEYS.TRANSACTIONS_PENDING_3DS_REVIEW,
    callback: (queue) => {
        if (!locallyProcessed3DSTransactionReviews || !queue) {
            return;
        }
        const queuedTransactionIDs = Object.keys(queue);
        const locallyProcessedTransactionIDsToCleanup = Object.keys(locallyProcessed3DSTransactionReviews).filter(
            (locallyProcessedTransactionID) => !queuedTransactionIDs.includes(locallyProcessedTransactionID),
        );
        if (locallyProcessedTransactionIDsToCleanup.length > 0) {
            cleanUpLocallyProcessed3DSTransactionReviews(locallyProcessedTransactionIDsToCleanup);
        }
    },
});

function cleanUpLocallyProcessed3DSTransactionReviews(entriesToDelete: string[]) {
    const value: Record<string, null> = {};
    for (const entry of entriesToDelete) {
        value[entry] = null;
    }
    Onyx.merge(ONYXKEYS.LOCALLY_PROCESSED_3DS_TRANSACTION_REVIEWS, value);
}

/**
 * The rest of this file is concerned with MFA-related API calls
 *
 * To keep the code clean and readable, these functions return parsed data in order to:
 *
 * - Check whether multifactorial authentication scenario was successful as we need to know it as fast as possible
 *   to make the usage of authentication seamless and to tell if we should abort the process
 *   if an error occurred.
 *
 * - To avoid storing challenge in the persistent memory for security reasons.
 *
 * - As there is a certain short time frame in which the challenge needs to be signed,
 *   we should not delay the possibility to do so for the user.
 *
 * This is not a standard practice in the code base.
 * Please consult before using this pattern.
 */

async function registerAuthenticationKey({keyInfo}: MultifactorAuthenticationScenarioParameters['REGISTER-BIOMETRICS']) {
    try {
        const response = await makeRequestWithSideEffects(SIDE_EFFECT_REQUEST_COMMANDS.REGISTER_AUTHENTICATION_KEY, {keyInfo: JSON.stringify(keyInfo)});

        const {jsonCode, message} = response ?? {};
        return parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.REGISTER_AUTHENTICATION_KEY, message);
    } catch (error) {
        Log.hmmm('[MFA] Failed to register an authentication key', {error});
        return parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.REGISTER_AUTHENTICATION_KEY);
    }
}

// What `fetch` rejects with when the connection drops, on web and on native.
const CONNECTION_LOST_MESSAGES = new Set<string>([
    CONST.ERROR.FAILED_TO_FETCH,
    CONST.ERROR.NETWORK_REQUEST_FAILED,
    CONST.ERROR.IOS_NETWORK_CONNECTION_LOST,
    CONST.ERROR.IOS_NETWORK_CONNECTION_LOST_RUSSIAN,
    CONST.ERROR.IOS_NETWORK_CONNECTION_LOST_SWEDISH,
    CONST.ERROR.IOS_NETWORK_CONNECTION_LOST_SPANISH,
]);

/**
 * Whether a request failed without an answer, so the app can't tell whether the server got it. A socket error
 * counts too: Web-Expensify gave up waiting for Auth, which may still run the command. An HTTP error status is
 * an answer, so it doesn't count.
 */
function isNoResponseError(error: unknown): boolean {
    if (error instanceof HttpsError && error.title === CONST.ERROR_TITLE.SOCKET) {
        return true;
    }
    return error instanceof Error && CONNECTION_LOST_MESSAGES.has(error.message);
}

/**
 * Parses a request that threw instead of answering. A lost answer becomes NO_RESPONSE, since the server may or may
 * not have the request. An HTTP error status is an answer, so it keeps its status (a 500 stays a server error).
 */
function parseRequestError(error: unknown, responseMap: Parameters<typeof parseHttpResponse>[1]): ReturnType<typeof parseHttpResponse> {
    const message = error instanceof Error ? error.message : undefined;
    if (isNoResponseError(error)) {
        return {httpStatusCode: 0, reason: CONST.MULTIFACTOR_AUTHENTICATION.REASON.LOCAL_ERRORS.NO_RESPONSE, message};
    }
    return parseHttpResponse(error instanceof HttpsError && error.status ? error.status : undefined, responseMap, message);
}

type RegistrationChallengeResponse = {
    httpStatusCode: number;
    reason: MultifactorAuthenticationReason | undefined;
    message: string | undefined;
    challenge: RegistrationChallenge | undefined;
    publicKeys: string[] | undefined;
};

type AuthenticationChallengeResponse = {
    httpStatusCode: number;
    reason: MultifactorAuthenticationReason | undefined;
    message: string | undefined;
    challenge: AuthenticationChallenge | undefined;
    publicKeys: string[] | undefined;
};

async function requestRegistrationChallenge(validateCode: string): Promise<RegistrationChallengeResponse> {
    try {
        const optimisticData: Array<OnyxUpdate<typeof ONYXKEYS.ACCOUNT>> = [
            {
                key: ONYXKEYS.ACCOUNT,
                onyxMethod: Onyx.METHOD.MERGE,
                value: {
                    isLoading: true,
                    loadingForm: CONST.FORMS.VALIDATE_CODE_FORM,
                },
            },
        ];
        const finallyData: Array<OnyxUpdate<typeof ONYXKEYS.ACCOUNT>> = [
            {
                key: ONYXKEYS.ACCOUNT,
                onyxMethod: Onyx.METHOD.MERGE,
                value: {
                    isLoading: false,
                    loadingForm: undefined,
                },
            },
        ];
        const response = await makeRequestWithSideEffects(
            SIDE_EFFECT_REQUEST_COMMANDS.REQUEST_AUTHENTICATION_CHALLENGE,
            {
                challengeType: 'registration',
                validateCode,
            },
            {optimisticData, finallyData},
        );
        const {jsonCode, challenge, publicKeys, message} = response ?? {};
        const parsedResponse = parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.REQUEST_AUTHENTICATION_CHALLENGE, message);

        if (challenge && !isRegistrationChallenge(challenge)) {
            Log.hmmm('[MFA] Received non-registration challenge from registration endpoint');
            return {
                ...parsedResponse,
                reason: CONST.MULTIFACTOR_AUTHENTICATION.REASON.LOCAL_ERRORS.UNRECOGNIZED,
                message: 'Invalid registration challenge type: received non-registration challenge',
                challenge: undefined,
                publicKeys,
            };
        }

        return {
            ...parsedResponse,
            challenge,
            publicKeys,
        };
    } catch (error) {
        Log.hmmm('[MFA] Failed to request a registration challenge', {error});
        return {
            ...parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.REQUEST_AUTHENTICATION_CHALLENGE),
            challenge: undefined,
            publicKeys: undefined,
        };
    }
}

async function requestAuthorizationChallenge(): Promise<AuthenticationChallengeResponse> {
    try {
        const response = await makeRequestWithSideEffects(
            SIDE_EFFECT_REQUEST_COMMANDS.REQUEST_AUTHENTICATION_CHALLENGE,
            {
                challengeType: 'authentication',
            },
            {},
        );
        const {jsonCode, challenge, publicKeys, message} = response ?? {};
        const parsedResponse = parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.REQUEST_AUTHENTICATION_CHALLENGE, message);

        if (challenge && !isAuthenticationChallenge(challenge)) {
            Log.hmmm('[MFA] Received non-authentication challenge from authorization endpoint');
            return {
                ...parsedResponse,
                reason: CONST.MULTIFACTOR_AUTHENTICATION.REASON.LOCAL_ERRORS.UNRECOGNIZED,
                message: 'Invalid authorization challenge type: received non-authentication challenge',
                challenge: undefined,
                publicKeys,
            };
        }

        return {
            ...parsedResponse,
            challenge,
            publicKeys,
        };
    } catch (error) {
        Log.hmmm('[MFA] Failed to request an authorization challenge', {error});
        return {
            // The machine requests a lost challenge once more (an unused one just expires on the server).
            ...parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.REQUEST_AUTHENTICATION_CHALLENGE),
            challenge: undefined,
            publicKeys: undefined,
        };
    }
}

async function troubleshootMultifactorAuthentication({signedChallenge, authenticationMethod}: MultifactorAuthenticationScenarioParameters['BIOMETRICS-TEST']) {
    try {
        const response = await makeRequestWithSideEffects(
            SIDE_EFFECT_REQUEST_COMMANDS.TROUBLESHOOT_MULTIFACTOR_AUTHENTICATION,
            {signedChallenge: JSON.stringify(signedChallenge), authenticationMethod},
            {},
        );

        const {jsonCode, message} = response ?? {};

        return parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.TROUBLESHOOT_MULTIFACTOR_AUTHENTICATION, message);
    } catch (error) {
        Log.hmmm('[MFA] Failed to troubleshoot multifactor authentication', {error});
        return parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.TROUBLESHOOT_MULTIFACTOR_AUTHENTICATION);
    }
}

async function revokeMultifactorAuthenticationCredentials(params: RevokeMultifactorAuthenticationCredentialsParams) {
    try {
        const response = await makeRequestWithSideEffects(SIDE_EFFECT_REQUEST_COMMANDS.REVOKE_MULTIFACTOR_AUTHENTICATION_CREDENTIALS, params ?? {}, {});
        const {jsonCode, message} = response ?? {};

        return parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.REVOKE_MULTIFACTOR_AUTHENTICATION_SETUP, message);
    } catch (error) {
        Log.hmmm('[MFA] Failed to revoke multifactor authentication credentials', {error});
        return parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.REVOKE_MULTIFACTOR_AUTHENTICATION_SETUP);
    }
}

async function setPersonalDetailsAndShipExpensifyCardsWithPIN(params: MultifactorAuthenticationScenarioParameters['SET-PIN-ORDER-CARD']) {
    try {
        const response = await makeRequestWithSideEffects(
            SIDE_EFFECT_REQUEST_COMMANDS.SET_PERSONAL_DETAILS_AND_SHIP_EXPENSIFY_CARDS_WITH_PIN,
            {
                ...params,
                signedChallenge: JSON.stringify(params.signedChallenge),
            },
            {
                optimisticData: [
                    {
                        onyxMethod: Onyx.METHOD.MERGE,
                        key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
                        value: {
                            isLoading: true,
                        },
                    },
                ],
                finallyData: [
                    {
                        onyxMethod: Onyx.METHOD.MERGE,
                        key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
                        value: {
                            isLoading: false,
                        },
                    },
                ],
            },
        );

        const {jsonCode, message} = response ?? {};
        return parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.SET_PERSONAL_DETAILS_AND_SHIP_EXPENSIFY_CARDS_WITH_PIN, message);
    } catch (error) {
        Log.hmmm('[MFA] Failed to set personal details and ship card with PIN', {error});
        return parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.SET_PERSONAL_DETAILS_AND_SHIP_EXPENSIFY_CARDS_WITH_PIN);
    }
}
async function revealPINForCard({cardID, signedChallenge, authenticationMethod}: MultifactorAuthenticationScenarioParameters['REVEAL-PIN']) {
    try {
        const response = await makeRequestWithSideEffects(SIDE_EFFECT_REQUEST_COMMANDS.REVEAL_CARD_PIN, {cardID, signedChallenge: JSON.stringify(signedChallenge), authenticationMethod}, {});

        const {jsonCode, message, pin} = response ?? {};
        const parsed = parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.REVEAL_CARD_PIN, message);

        return {
            ...parsed,
            body: {pin: String(pin ?? '')},
        };
    } catch (error) {
        Log.hmmm('[MultifactorAuthentication] Failed to reveal PIN for card', {error});
        return parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.REVEAL_CARD_PIN);
    }
}

async function changePINForCard({cardID, pin, signedChallenge, authenticationMethod}: MultifactorAuthenticationScenarioParameters['CHANGE-PIN']) {
    try {
        const response = await makeRequestWithSideEffects(
            SIDE_EFFECT_REQUEST_COMMANDS.CHANGE_CARD_PIN,
            {cardID, pin, signedChallenge: JSON.stringify(signedChallenge), authenticationMethod},
            {},
        );

        const {jsonCode, message} = response ?? {};
        return parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.CHANGE_CARD_PIN, message);
    } catch (error) {
        Log.hmmm('[MultifactorAuthentication] Failed to change PIN for card', {error});
        return parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.CHANGE_CARD_PIN);
    }
}

async function setPersonalDetailsAndRevealExpensifyCardWithSCA(params: MultifactorAuthenticationScenarioParameters['SET-PERSONAL-DETAILS-AND-REVEAL-CARD-DETAILS']) {
    // `isFromMissingDetailsFlow` is a UI-only flag consumed by the scenario callback to drive
    // post-reveal navigation; the backend doesn't expect it.
    const {isFromMissingDetailsFlow, ...apiParams} = params;
    try {
        const response = await makeRequestWithSideEffects(
            SIDE_EFFECT_REQUEST_COMMANDS.SET_PERSONAL_DETAILS_AND_REVEAL_EXPENSIFY_CARD,
            {
                ...apiParams,
                signedChallenge: JSON.stringify(apiParams.signedChallenge),
            },
            {
                optimisticData: [
                    {
                        onyxMethod: Onyx.METHOD.MERGE,
                        key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
                        value: {
                            isLoading: true,
                        },
                    },
                ],
                finallyData: [
                    {
                        onyxMethod: Onyx.METHOD.MERGE,
                        key: ONYXKEYS.PRIVATE_PERSONAL_DETAILS,
                        value: {
                            isLoading: false,
                        },
                    },
                ],
            },
        );

        const {jsonCode, message, pan, expiration, cvv} = response ?? {};
        const parsed = parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.SET_PERSONAL_DETAILS_AND_REVEAL_EXPENSIFY_CARD, message);

        return {
            ...parsed,
            body: {
                pan: typeof pan === 'string' ? pan : '',
                expiration: typeof expiration === 'string' ? expiration : '',
                cvv: typeof cvv === 'string' ? cvv : '',
            },
        };
    } catch (error) {
        Log.hmmm('[MultifactorAuthentication] Failed to set personal details and reveal card details for card', {error});
        return parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.SET_PERSONAL_DETAILS_AND_REVEAL_EXPENSIFY_CARD);
    }
}

/** Check whether a given transaction is still pending review and update the transactionsPending3DSReview key in Onyx */
async function isTransactionStillPending3DSReview(transactionID: string) {
    const response = await makeRequestWithSideEffects(SIDE_EFFECT_REQUEST_COMMANDS.GET_TRANSACTIONS_PENDING_3DS_REVIEW, null, {});
    return !!response?.transactionsPending3DSReview?.[transactionID];
}

async function authorizeTransaction({transactionID, signedChallenge, authenticationMethod}: MultifactorAuthenticationScenarioParameters['AUTHORIZE-TRANSACTION']) {
    try {
        const response = await makeRequestWithSideEffects(
            SIDE_EFFECT_REQUEST_COMMANDS.AUTHORIZE_TRANSACTION,
            {transactionID, signedChallenge: JSON.stringify(signedChallenge), authenticationMethod},
            {
                optimisticData: [
                    {
                        key: ONYXKEYS.LOCALLY_PROCESSED_3DS_TRANSACTION_REVIEWS,
                        onyxMethod: Onyx.METHOD.MERGE,
                        value: {
                            [transactionID]: CONST.MULTIFACTOR_AUTHENTICATION.LOCALLY_PROCESSED_TRANSACTION_ACTION.APPROVE,
                        },
                    },
                ],
            },
        );

        const {jsonCode, message} = response ?? {};

        return parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.APPROVE_TRANSACTION, message);
    } catch (error) {
        Log.hmmm('[MFA] Failed to authorize transaction', {error});
        return parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.APPROVE_TRANSACTION);
    }
}

async function denyTransaction({transactionID}: DenyTransactionParams) {
    try {
        const response = await makeRequestWithSideEffects(
            SIDE_EFFECT_REQUEST_COMMANDS.DENY_TRANSACTION,
            {transactionID},
            {
                optimisticData: [
                    {
                        key: ONYXKEYS.LOCALLY_PROCESSED_3DS_TRANSACTION_REVIEWS,
                        onyxMethod: Onyx.METHOD.MERGE,
                        value: {
                            [transactionID]: CONST.MULTIFACTOR_AUTHENTICATION.LOCALLY_PROCESSED_TRANSACTION_ACTION.DENY,
                        },
                    },
                ],
            },
        );

        const {jsonCode, message} = response ?? {};

        return parseHttpResponse(jsonCode, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.DENY_TRANSACTION, message);
    } catch (error) {
        Log.hmmm('[MFA] Failed to deny transaction', {error});
        return parseRequestError(error, CONST.MULTIFACTOR_AUTHENTICATION.API_RESPONSE_MAP.DENY_TRANSACTION);
    }
}

/** Attempt to deny the transaction without handling errors or waiting for a response. We use this to clean up after something unexpected happened trying to authorize or deny a challenge */
async function fireAndForgetDenyTransaction({transactionID}: DenyTransactionParams) {
    makeRequestWithSideEffects(
        SIDE_EFFECT_REQUEST_COMMANDS.DENY_TRANSACTION,
        {transactionID},
        {
            optimisticData: [
                {
                    key: ONYXKEYS.LOCALLY_PROCESSED_3DS_TRANSACTION_REVIEWS,
                    onyxMethod: Onyx.METHOD.MERGE,
                    value: {
                        [transactionID]: CONST.MULTIFACTOR_AUTHENTICATION.LOCALLY_PROCESSED_TRANSACTION_ACTION.DENY,
                    },
                },
            ],
        },
    );
}

function getDeviceBiometricsOnyxKey(accountID: number): `${typeof ONYXKEYS.COLLECTION.DEVICE_BIOMETRICS}${string}` {
    return `${ONYXKEYS.COLLECTION.DEVICE_BIOMETRICS}${accountID}`;
}

function markHasAcceptedSoftPrompt(accountID: number) {
    Onyx.merge(getDeviceBiometricsOnyxKey(accountID), {
        hasAcceptedSoftPrompt: true,
    });
}

function clearLocalMFAPublicKeyList() {
    Onyx.merge(ONYXKEYS.ACCOUNT, {
        multifactorAuthenticationPublicKeyIDs: CONST.MULTIFACTOR_AUTHENTICATION.PUBLIC_KEYS_PREVIOUSLY_BUT_NOT_CURRENTLY_REGISTERED,
    });
}

export {
    registerAuthenticationKey,
    requestRegistrationChallenge,
    requestAuthorizationChallenge,
    troubleshootMultifactorAuthentication,
    revokeMultifactorAuthenticationCredentials,
    getDeviceBiometricsOnyxKey,
    markHasAcceptedSoftPrompt,
    clearLocalMFAPublicKeyList,
    setPersonalDetailsAndShipExpensifyCardsWithPIN,
    revealPINForCard,
    changePINForCard,
    setPersonalDetailsAndRevealExpensifyCardWithSCA,
    isTransactionStillPending3DSReview,
    denyTransaction,
    authorizeTransaction,
    fireAndForgetDenyTransaction,
};
