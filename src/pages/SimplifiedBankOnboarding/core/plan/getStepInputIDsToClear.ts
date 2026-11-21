import type {InputID} from '@pages/SimplifiedBankOnboarding/contract/form';
import {getInputIDsToClear} from '@pages/SimplifiedBankOnboarding/core/form/fields/fieldSet';

import type {PageConfig, StepConfig} from './types';

function getPageInputIDsToClear(page: PageConfig): InputID[] {
    if (page.kind === 'question') {
        return [page.fieldID];
    }
    return page.kind === 'form' ? getInputIDsToClear(page.fields) : [];
}

/**
 * The inputs that the draft drops once the step request succeeded. The server holds their values then, so the answers
 * come from the server again and an old draft value never hides a newer server value. Inputs that only the client
 * needs, such as the owner being edited, are no longer needed after the step. A field whose value the server never
 * returns, such as a file, stays in the draft.
 */
function getStepInputIDsToClear(step: StepConfig): InputID[] {
    return step.pages.flatMap(getPageInputIDsToClear);
}

export default getStepInputIDsToClear;
