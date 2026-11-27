import type {RequestKey} from '@pages/SimplifiedBankOnboarding/core/requests/requestKey';

import type {PageConfig, StepConfig} from './types';

/**
 * The request that the controller sends from the open page, whose spinner and error the page shows: the request of the
 * page itself, else the request of the step on the last page of the step, which is the page that sends it. The request
 * of a custom page is not one of them, because the page sends it and reads its state itself.
 */
function getPageRequestKey(step: StepConfig | undefined, page: PageConfig | undefined): RequestKey | undefined {
    if (!step || !page) {
        return undefined;
    }
    if (page.kind !== 'custom' && page.request) {
        return page.request.key;
    }
    return step.pages.at(-1)?.id === page.id ? step.request?.key : undefined;
}

export default getPageRequestKey;
