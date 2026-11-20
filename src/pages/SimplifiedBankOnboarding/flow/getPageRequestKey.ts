import type {PageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {RequestKey} from '@pages/SimplifiedBankOnboarding/requests/requestKey';

/**
 * The request whose spinner and error the open page shows: the request of the page itself, else the request of the step
 * on the last page of the step, which is the page that sends it.
 */
function getPageRequestKey(step: StepConfig | undefined, page: PageConfig | undefined): RequestKey | undefined {
    if (!step || !page) {
        return undefined;
    }
    if (page.requestKey) {
        return page.requestKey;
    }
    return step.pages.at(-1)?.id === page.id ? step.requestKey : undefined;
}

export default getPageRequestKey;
