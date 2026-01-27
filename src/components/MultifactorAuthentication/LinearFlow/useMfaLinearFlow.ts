/**
 * MFA Linear Flow Hook.
 * Provides same API as original useMultifactorAuthenticationContext.
 */
import {useCallback, useMemo, useRef, useState} from 'react';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import type {MultifactorAuthenticationTrigger} from '@libs/MultifactorAuthentication/Biometrics/types';
import {MultifactorAuthenticationCallbacks} from '@libs/MultifactorAuthentication/Biometrics/VALUES';
import Navigation from '@navigation/Navigation';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import type {Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';
import {MULTIFACTOR_AUTHENTICATION_OUTCOME_MAP} from '../config';
import type {MultifactorAuthenticationScenario, MultifactorAuthenticationScenarioParams} from '../config/types';
import {doesDeviceSupportBiometrics, getOutcomePaths, isValidScenario} from '../helpers';
import type {OutcomePaths} from '../types';
import {createInitialState, process} from './process';
import type {MfaState, TriggerArgument} from './types';

const EMPTY_STATE: MfaState = {
    deviceSupported: false,
    isRegistered: false,
    isComplete: false,
};

function useMfaLinearFlow() {
    const {translate} = useLocalize();
    const {accountID} = useCurrentUserPersonalDetails();
    const [state, setStateRaw] = useState<MfaState>(EMPTY_STATE);
    const stateRef = useRef<MfaState>(EMPTY_STATE);

    // Persistence refs - matches original Context.tsx behavior
    const softPromptAcceptedRef = useRef<boolean | undefined>(undefined);
    const storedValidateCodeRef = useRef<number | undefined>(undefined);

    const setState = useCallback((updates: Partial<MfaState>) => {
        stateRef.current = {...stateRef.current, ...updates};
        setStateRaw(stateRef.current);
    }, []);

    const runCallbacks = useCallback(() => {
        for (const callback of Object.values(MultifactorAuthenticationCallbacks.onFulfill)) {
            callback();
        }
    }, []);

    /**
     * Get translated UI strings based on current state and outcome
     */
    const getTranslatedInfo = useCallback(
        (currentState: MfaState) => {
            const outcomeType = currentState.success ? 'successOutcome' : 'failureOutcome';
            const outcomePath = currentState.outcomePaths?.[outcomeType];

            if (outcomePath && MULTIFACTOR_AUTHENTICATION_OUTCOME_MAP[outcomePath]) {
                const config = MULTIFACTOR_AUTHENTICATION_OUTCOME_MAP[outcomePath];
                return {
                    title: translate(config.title),
                    headerTitle: translate(config.headerTitle),
                    description: translate(config.description),
                };
            }

            // Default fallback
            return {
                title: '',
                headerTitle: '',
                description: '',
            };
        },
        [translate],
    );

    /**
     * Build outcome paths from scenario or use custom ones
     */
    const buildOutcomePaths = useCallback((scenario: MultifactorAuthenticationScenario, customPaths?: Partial<OutcomePaths>): OutcomePaths => {
        const defaultPaths = getOutcomePaths(scenario);
        return {
            successOutcome: customPaths?.successOutcome ?? defaultPaths.successOutcome,
            failureOutcome: customPaths?.failureOutcome ?? defaultPaths.failureOutcome,
        };
    }, []);

    /**
     * Start flow - equivalent to proceed() in original context
     */
    const start = useCallback(
        async <T extends MultifactorAuthenticationScenario>(scenario: T, params?: MultifactorAuthenticationScenarioParams<T> & Partial<OutcomePaths>) => {
            // Extract outcome paths from params
            const {successOutcome, failureOutcome, ...restParams} = params ?? {};
            const outcomePaths = buildOutcomePaths(scenario, {successOutcome, failureOutcome});

            // Use persisted values if not provided (matches original behavior)
            const validateCode = (restParams as {validateCode?: number}).validateCode ?? storedValidateCodeRef.current;
            const softPromptAccepted = softPromptAcceptedRef.current;

            // Store validateCode for later use
            if (validateCode !== undefined) {
                storedValidateCodeRef.current = validateCode;
            }

            const initialState = await createInitialState(accountID, scenario, restParams);

            // Merge with persisted and outcome data
            const stateWithExtras: MfaState = {
                ...initialState,
                outcomePaths,
                validateCode: validateCode ?? initialState.validateCode,
                softPromptAccepted: softPromptAccepted ?? initialState.softPromptAccepted,
            };

            stateRef.current = stateWithExtras;
            setStateRaw(stateWithExtras);

            await process(stateWithExtras, accountID, (key: string) => translate(key as TranslationPaths), setState);

            // Only run callbacks when flow is complete and fulfilled (not on cancel)
            if (stateRef.current.isComplete && stateRef.current.success !== undefined) {
                runCallbacks();
            }

            return stateRef.current;
        },
        [accountID, translate, setState, runCallbacks, buildOutcomePaths],
    );

    /**
     * Continue flow - equivalent to update() in original context
     */
    const continueFlow = useCallback(
        async (data: {validateCode?: number; softPromptAccepted?: boolean}) => {
            if (stateRef.current.isComplete) {
                return stateRef.current;
            }

            // Persist values to refs (matches original behavior)
            if (data.validateCode !== undefined) {
                storedValidateCodeRef.current = data.validateCode;
            }
            if (data.softPromptAccepted !== undefined) {
                softPromptAcceptedRef.current = data.softPromptAccepted;
            }

            setState(data);

            await process(stateRef.current, accountID, (key: string) => translate(key as TranslationPaths), setState);

            // Only run callbacks when flow is complete and fulfilled
            if (stateRef.current.isComplete && stateRef.current.success !== undefined) {
                runCallbacks();
            }

            return stateRef.current;
        },
        [accountID, translate, setState, runCallbacks],
    );

    /**
     * Cancel flow - resets state and refs
     */
    const cancel = useCallback(
        (wasRecentStepSuccessful?: boolean, customOutcomePaths?: Partial<OutcomePaths>) => {
            // Reset persisted values (matches original behavior)
            softPromptAcceptedRef.current = undefined;
            storedValidateCodeRef.current = undefined;

            // Merge outcome paths
            const outcomePaths: OutcomePaths = {
                successOutcome: customOutcomePaths?.successOutcome ?? stateRef.current.outcomePaths?.successOutcome ?? 'biometrics-test-success',
                failureOutcome: customOutcomePaths?.failureOutcome ?? stateRef.current.outcomePaths?.failureOutcome ?? 'biometrics-test-failure',
            };

            setState({
                isComplete: true,
                success: wasRecentStepSuccessful,
                outcomePaths,
            });

            // Navigate to appropriate outcome
            const outcomeType = wasRecentStepSuccessful ? 'successOutcome' : 'failureOutcome';
            const outcomePath = outcomePaths[outcomeType];

            if (outcomePath) {
                const route = ROUTES.MULTIFACTOR_AUTHENTICATION_OUTCOME.getRoute(outcomePath);
                if (!Navigation.isActiveRoute(route)) {
                    Navigation.navigate(route);
                }
            }

            return stateRef.current;
        },
        [setState],
    );

    /**
     * Trigger flow completion - equivalent to trigger() in original context
     * Supports optional argument for custom outcome paths (matches original API)
     */
    const trigger = useCallback(
        async <T extends MultifactorAuthenticationTrigger>(triggerType: T, argument?: TriggerArgument) => {
            // Process argument to extract outcome paths (matches original logic)
            let customOutcomePaths: Partial<OutcomePaths> = {};

            if (argument) {
                if (isValidScenario(argument)) {
                    // Argument is a scenario - get its outcome paths
                    customOutcomePaths = getOutcomePaths(argument);
                } else {
                    // Argument is a custom outcome path
                    if (triggerType === CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL) {
                        customOutcomePaths.successOutcome = argument;
                    } else {
                        customOutcomePaths.failureOutcome = argument;
                    }
                }
            }

            // Determine success state based on trigger type
            let wasRecentStepSuccessful: boolean | undefined;
            switch (triggerType) {
                case CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL:
                    wasRecentStepSuccessful = true;
                    runCallbacks(); // Only FULFILL triggers callbacks
                    break;
                case CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FAILURE:
                    wasRecentStepSuccessful = false;
                    break;
                default:
                    wasRecentStepSuccessful = undefined;
            }

            return Promise.resolve(cancel(wasRecentStepSuccessful, customOutcomePaths));
        },
        [cancel, runCallbacks],
    );

    // Compute translated info based on current state
    const translatedInfo = useMemo(() => getTranslatedInfo(state), [getTranslatedInfo, state]);

    // Info object for UI (compatible with original context)
    const info = useMemo(
        () => ({
            deviceSupportBiometrics: doesDeviceSupportBiometrics(),
            isLocalPublicKeyInAuth: state.isRegistered,
            isBiometryRegisteredLocally: state.isRegistered,
            isAnyDeviceRegistered: state.isRegistered,
            scenario: state.scenario,
            success: state.isComplete ? state.success : undefined,
            title: translatedInfo.title,
            headerTitle: translatedInfo.headerTitle,
            description: translatedInfo.description,
        }),
        [state.isRegistered, state.scenario, state.isComplete, state.success, translatedInfo],
    );

    return {state, info, start, continueFlow, cancel, trigger};
}

export default useMfaLinearFlow;
