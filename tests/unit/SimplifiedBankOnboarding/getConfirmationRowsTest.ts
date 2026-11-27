import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import getConfirmationRows from '@pages/SimplifiedBankOnboarding/core/form/pages/getConfirmationRows';
import {findStep} from '@pages/SimplifiedBankOnboarding/core/plan/position/position';
import buildNonUSDPlan from '@pages/SimplifiedBankOnboarding/flows/nonUSD/buildNonUSDPlan';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';
import type {FlowPlan} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';
import buildUSDPlan from '@pages/SimplifiedBankOnboarding/flows/usd/buildUSDPlan';

const USD = SBO_CONST.USD;
const NON_USD = SBO_CONST.NON_USD;

/** Returns the key with its parameters, so a label of a row names the translation it came from */
const translate: LocalizedTranslate = (path, ...parameters) => [path, ...parameters.map(String)].join(' ');
const context = {translate, policyID: 'workspace'};

function getRows(plan: FlowPlan, stepID: StepID, confirmationPageID: PageID) {
    const step = findStep(plan, stepID);
    if (!step) {
        throw new Error(`The plan has no step ${stepID}`);
    }
    return getConfirmationRows(step, confirmationPageID, plan.answers, translate);
}

/** The plans of these tests come from the draft alone */
function getDraftOnlyData(draft: OnboardingDraft): FlowData {
    return {draft, account: undefined, bankFields: undefined, picklists: undefined, workspaces: undefined, plaidLinkToken: undefined, onfidoToken: undefined};
}

function buildNonUSDPlanFromDraft(draft: OnboardingDraft) {
    return buildNonUSDPlan(getDraftOnlyData(draft), context);
}

describe('getConfirmationRows', () => {
    it('shows one row per field of the form pages before the confirmation, each opening its page', () => {
        // Given a USD user who typed the personal details
        const plan = buildUSDPlan(getDraftOnlyData({firstName: 'Ada', lastName: 'Lovelace', dob: '1980-05-05', ssnLast4: '1234'}), context);

        // When the confirmation of the personal info step lists its rows
        const rows = getRows(plan, USD.PAGE_NAMES.REQUESTOR, USD.PERSONAL_INFO_SUB_PAGES.CONFIRMATION);

        // Then the rows come from the fields of the step, so the plan never repeats them, and the two name inputs show as one name
        expect(rows).toEqual([
            {id: 'firstName', label: 'personalInfoStep.legalName', value: 'Ada Lovelace', editPageID: USD.PERSONAL_INFO_SUB_PAGES.FULL_NAME},
            {id: 'dob', label: 'common.dob', value: '1980-05-05', editPageID: USD.PERSONAL_INFO_SUB_PAGES.DATE_OF_BIRTH},
            {id: 'ssnLast4', label: 'personalInfoStep.last4SSN', value: '1234', editPageID: USD.PERSONAL_INFO_SUB_PAGES.SSN},
        ]);
    });

    it('shows the label of a picked option instead of its value', () => {
        // Given a USD user who picked a company type
        const incorporationType = Object.values(USD.INCORPORATION_TYPES).at(0) ?? '';
        const plan = buildUSDPlan(getDraftOnlyData({companyName: 'Acme', companyTaxID: '123456789', incorporationType}), context);

        // When the confirmation of the company step lists its rows
        const rows = getRows(plan, USD.PAGE_NAMES.COMPANY, USD.BUSINESS_INFO_SUB_PAGES.CONFIRMATION);

        // Then the last row belongs to the picklist page and reads like the option that the user picked
        expect(rows.at(-1)).toEqual({
            id: 'incorporationType',
            label: 'businessInfoStep.companyType',
            value: incorporationType,
            editPageID: USD.BUSINESS_INFO_SUB_PAGES.INCORPORATION_TYPE,
        });
    });

    it('leaves out the pages that follow the confirmation and the pages that are not forms', () => {
        // Given a NonUSD user who owns a share and enters their own details in the owner step
        const plan = buildNonUSDPlanFromDraft({
            ownsMoreThan25Percent: true,
            ownerBeingModifiedID: NON_USD.CURRENT_USER_KEY,
            ownerFirstName: 'Ada',
            ownerLastName: 'Lovelace',
            ownerOwnershipPercentage: '40',
        });

        // When the confirmation of the owner lists its rows
        const rows = getRows(plan, NON_USD.PAGE_NAMES.BENEFICIAL_OWNER_INFO, NON_USD.BENEFICIAL_OWNER_INFO_SUB_PAGES.CONFIRMATION);

        // Then only the owner details show, with the share formatted by its field, and the questions around them add no row
        expect(rows).toEqual([
            {id: 'ownerFirstName', label: 'personalInfoStep.legalName', value: 'Ada Lovelace', editPageID: NON_USD.BENEFICIAL_OWNER_INFO_SUB_PAGES.NAME},
            {
                id: 'ownerOwnershipPercentage',
                label: 'ownershipInfoStep.ownershipPercentage',
                value: '40%',
                editPageID: NON_USD.BENEFICIAL_OWNER_INFO_SUB_PAGES.OWNERSHIP_PERCENTAGE,
            },
        ]);
    });

    it('has no row for a page that the answers left out of the plan', () => {
        // Given a NonUSD director who is also a listed owner, so the signer step does not ask for the name again
        const plan = buildNonUSDPlanFromDraft({
            ownsMoreThan25Percent: true,
            globalOwners: [{id: NON_USD.CURRENT_USER_KEY, firstName: 'Ada', lastName: 'Lovelace', ownershipPercentage: '40'}],
            isUserDirector: true,
            signerJobTitle: 'CEO',
        });

        // When the confirmation of the signer step lists its rows
        const rows = getRows(plan, NON_USD.PAGE_NAMES.SIGNER_INFO, NON_USD.SIGNER_INFO_SUB_PAGES.CONFIRMATION);

        // Then only the job title shows, because a name that has no page here could not be edited from the row
        expect(rows).toEqual([{id: 'signerJobTitle', label: 'signerInfoStep.jobTitle', value: 'CEO', editPageID: NON_USD.SIGNER_INFO_SUB_PAGES.JOB_TITLE}]);
    });
});
