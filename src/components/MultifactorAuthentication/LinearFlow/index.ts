/**
 * Linear MFA Flow - Simplified MFA with single process function.
 *
 * Files:
 * - types.ts   → MfaState, MfaError, TriggerArgument
 * - process.ts → Main process() function with if/else flow
 * - useMfaLinearFlow.ts → React hook
 * - LinearMfaContextProvider.tsx → React context (same API as original)
 *
 * Usage:
 * ```tsx
 * <LinearMfaContextProvider>
 *   <App />
 * </LinearMfaContextProvider>
 *
 * const {proceed, update, trigger} = useLinearMfaContext();
 * await proceed(BIOMETRICS_TEST);
 * await update({validateCode: 123456});
 * await update({softPromptDecision: true});
 * await trigger(CONST.MULTIFACTOR_AUTHENTICATION.TRIGGER.FULFILL, 'custom-outcome');
 * ```
 */

export {default as LinearMfaContextProvider, useLinearMfaContext} from './LinearMfaContextProvider';
export {default as useMfaLinearFlow} from './useMfaLinearFlow';
export {process, createInitialState} from './process';
export type {MfaState, MfaError, TriggerArgument} from './types';
