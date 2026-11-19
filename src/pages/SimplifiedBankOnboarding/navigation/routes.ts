/**
 * The link between a flow position and the lab routes. The URL holds the position: `page` is the step, `subPage` is
 * the page and the `edit` action marks a page opened from the confirmation of its step. The invited director page has
 * one step only, so its URL holds the page alone.
 */
import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/flow/position';

import ROUTES from '@src/ROUTES';
import type {Route} from '@src/ROUTES';

type FlowRouteTarget =
    | {
          kind: 'usd' | 'nonUSD';
          policyID: string | undefined;
          backTo: Route | undefined;
      }
    | {
          kind: 'enterSignerInfo';
          policyID: string | undefined;
          bankAccountID: number | undefined;
          isCompleted: boolean;
      };

type FlowRouteParams = {
    page?: string;
    subPage?: string;
    action?: 'edit';
};

/** The step of the invited director page, which its URL does not name */
const ENTER_SIGNER_INFO_STEP_ID = 'signer-info';

/** Undefined when the URL does not name a full position, so the flow opens the position where it resumes */
function getPositionFromParams(target: FlowRouteTarget, {page, subPage, action}: FlowRouteParams): FlowPosition | undefined {
    const stepID = target.kind === 'enterSignerInfo' ? ENTER_SIGNER_INFO_STEP_ID : page;
    if (!stepID || !subPage) {
        return undefined;
    }
    return {stepID, pageID: subPage, isEditing: action === 'edit'};
}

function getPositionRoute(target: FlowRouteTarget, {stepID, pageID, isEditing}: FlowPosition): Route {
    const action = isEditing ? 'edit' : undefined;
    switch (target.kind) {
        case 'usd':
            return ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID: target.policyID, page: stepID, subPage: pageID, action, backTo: target.backTo});
        case 'nonUSD':
            return ROUTES.SETTINGS_BANK_ONBOARDING_LAB_NON_USD_SETUP.getRoute({policyID: target.policyID, page: stepID, subPage: pageID, action, backTo: target.backTo});
        case 'enterSignerInfo':
        default:
            return ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTER_SIGNER_INFO.getRoute({
                policyID: target.policyID,
                bankAccountID: target.bankAccountID,
                isCompleted: target.isCompleted,
                subPage: pageID,
                action,
            });
    }
}

/** The entry page that opened the flow. The invited director page is opened from an email, so it has none. */
function getEntryRoute(target: FlowRouteTarget): Route | undefined {
    if (target.kind === 'enterSignerInfo') {
        return undefined;
    }
    return ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTRY.getRoute({policyID: target.policyID, backTo: target.backTo});
}

export {ENTER_SIGNER_INFO_STEP_ID, getEntryRoute, getPositionFromParams, getPositionRoute};
export type {FlowRouteParams, FlowRouteTarget};
