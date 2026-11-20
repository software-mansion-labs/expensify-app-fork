/**
 * The old import path of the setup checks. The frozen landing page still imports from here, so the file forwards to the
 * model and request modules that own the logic now.
 */
import {hasInProgressNonUSDSetup, hasInProgressSetup, hasInProgressUSDSetup, isSupportedCurrency, requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import getBankAccountParams from '@pages/SimplifiedBankOnboarding/requests/getBankAccountParams';

export {getBankAccountParams, hasInProgressNonUSDSetup, hasInProgressSetup, hasInProgressUSDSetup, isSupportedCurrency, requiresDocusignStep};
