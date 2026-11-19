/**
 * The NonUSD country step as plan config. The user confirms the currency of the workspace and the country of the
 * bank, because the country decides which bank inputs the server asks for.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {PicklistOption, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type NonUSDStepInput from './types';

function getCountryOptions(currency: string, translate: LocalizedTranslate): PicklistOption[] {
    if (currency === SBO_CONST.CURRENCY.EUR) {
        return SBO_CONST.EUR_COUNTRIES.map((country) => ({value: country, label: translate(`allCountries.${country}`)}));
    }
    if (currency === SBO_CONST.CURRENCY.AUD) {
        return [{value: SBO_CONST.COUNTRY.AU, label: translate('allCountries.AU')}];
    }
    return [];
}

/**
 * The currency of the workspace decides the countries: a EUR workspace picks one of its countries and an AUD workspace
 * gets its only country locked. The country is locked once the account exists, because the account belongs to that
 * country. Confirm only keeps the country in the draft, the server receives it with the bank account.
 */
function getCountryStep({answers, achData, currency, isCountryConfirmed, translate}: NonUSDStepInput): StepConfig {
    const canChangeCountry = currency === SBO_CONST.CURRENCY.EUR && !achData?.created;
    return {
        id: SBO_CONST.NON_USD.PAGE_NAMES.COUNTRY,
        title: translate('countryStep.confirmCurrency'),
        counterIndex: 0,
        isComplete: isCountryConfirmed,
        pages: [
            {
                kind: 'form',
                id: SBO_CONST.NON_USD.COUNTRY_SUB_PAGES.CONFIRM_CURRENCY,
                isComplete: isCountryConfirmed,
                title: translate('countryStep.confirmBusinessBank'),
                submitLabel: translate('common.confirm'),
                enabledWhenOffline: true,
                fields: [
                    {type: 'readOnly', id: 'currency', label: translate('common.currency'), value: currency},
                    {
                        type: 'picklist',
                        id: INPUT_IDS.COUNTRY,
                        label: translate('common.country'),
                        defaultValue: answers.country,
                        options: getCountryOptions(currency, translate),
                        modalTitle: translate('countryStep.selectCountry'),
                        searchTitle: translate('countryStep.findCountry'),
                        isRequired: true,
                        isLocked: !canChangeCountry,
                    },
                ],
            },
        ],
    };
}

export default getCountryStep;
