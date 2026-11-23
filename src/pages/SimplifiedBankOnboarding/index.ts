/**
 * The entry of the bank onboarding lab: the screens that the navigators register and the types of the Onyx keys. The
 * app imports nothing else from this module. From here the tree goes down: `lab/` and `entry/` open the flows of
 * `flows/`, a flow is a configuration for the engine in `core/`, and all of them share the data shapes of `contract/`.
 */
export {default as OnboardingEntryPage} from './entry/OnboardingEntryPage';
export {default as VerifyAccountPage} from './entry/VerifyAccountPage';
export {EnterSignerInfoPage, NonUSDSetupPage, USDSetupPage} from './flows';
export {default as BankOnboardingLabPage} from './lab/BankOnboardingLabPage';
export {default as WorkspacePaymentsPage} from './lab/WorkspacePaymentsPage';

export type {EnterSignerInfoForm, OnboardingForm} from './contract/form';
export type {BankFields, OnboardingAccount, OnboardingPicklists, OnboardingUser, PlaidData, Workspaces} from './contract/onyx';
export type {OnboardingRequests} from './core';
export type {MockServerDatabase} from './mockBackend/types';
