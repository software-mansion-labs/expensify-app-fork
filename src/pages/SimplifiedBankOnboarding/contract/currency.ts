/** The currency of a setup and the rules that depend on it */
import type {OnyxEntry} from 'react-native-onyx';

import type {OnboardingDraft} from './form';
import type {ACHData, Workspace} from './onyx';

import SBO_CONST from './SBO_CONST';

/** The workspace names the currency. Without a workspace, the account and then the draft tell it. */
function getSetupCurrency(workspace: OnyxEntry<Workspace>, achData: OnyxEntry<ACHData>, draft: OnyxEntry<OnboardingDraft>): string {
    return workspace?.outputCurrency ?? achData?.currency ?? draft?.currency ?? '';
}

function isNonUSDCurrency(currency: string): boolean {
    return !!currency && currency !== SBO_CONST.CURRENCY.USD;
}

function isSupportedCurrency(currency: string): boolean {
    return SBO_CONST.SUPPORTED_CURRENCIES.some((supportedCurrency) => supportedCurrency === currency);
}

/** Only some currencies need the extra step that collects a signed authorization form */
function requiresDocusignStep(currency: string): boolean {
    return currency === SBO_CONST.CURRENCY.AUD;
}

/** AUD always asks for a second director, also when the user is a director */
function requiresSecondDirector(currency: string): boolean {
    return currency === SBO_CONST.CURRENCY.AUD;
}

export {getSetupCurrency, isNonUSDCurrency, isSupportedCurrency, requiresDocusignStep, requiresSecondDirector};
