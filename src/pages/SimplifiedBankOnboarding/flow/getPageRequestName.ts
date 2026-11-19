import type {PageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {RequestName} from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';

/**
 * The request whose spinner and error the open page shows: the request of the page itself, else the request of the step
 * on the last page of the step, which is the page that sends it.
 */
function getPageRequestName(step: StepConfig | undefined, page: PageConfig | undefined): RequestName | undefined {
    if (!step || !page) {
        return undefined;
    }
    if (page.requestName) {
        return page.requestName;
    }
    return step.pages.at(-1)?.id === page.id ? step.requestName : undefined;
}

export default getPageRequestName;
