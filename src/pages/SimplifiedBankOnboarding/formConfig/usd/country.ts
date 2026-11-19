import type {StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type USDStepInput from './types';

/** The USD flow only supports the United States, so the step only confirms the country. Nothing is sent to the server. */
function getCountryStep({answers, achData, translate}: USDStepInput): StepConfig {
    return {
        id: SBO_CONST.USD.PAGE_NAMES.COUNTRY,
        title: translate('countryStep.confirmCurrency'),
        counterIndex: 0,
        isComplete: !!answers.country || !!achData?.accountNumber,
        pages: [
            {
                kind: 'form',
                id: SBO_CONST.USD.COUNTRY_SUB_PAGES.CONFIRM_CURRENCY,
                isComplete: !!answers.country || !!achData?.accountNumber,
                title: translate('countryStep.confirmCurrency'),
                description: translate('countryStep.confirmBusinessBank'),
                submitLabel: translate('common.confirm'),
                enabledWhenOffline: true,
                fields: [
                    {
                        type: 'picklist',
                        id: INPUT_IDS.COUNTRY,
                        label: translate('common.country'),
                        defaultValue: SBO_CONST.COUNTRY.US,
                        options: [{value: SBO_CONST.COUNTRY.US, label: translate('allCountries.US')}],
                        isRequired: true,
                        isLocked: true,
                    },
                ],
            },
        ],
    };
}

export default getCountryStep;
