/**
 * A small flow for the tests of the flow controller, so they do not depend on the plans of the real flows. The company
 * step has two text pages, a confirmation and a step request, and the owner step has one text page. There is no server:
 * a page counts as complete once its answer is in the draft, and each test answers the step request itself.
 */
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {FlowDescriptor, FlowPlan, FlowPosition, FlowRoutes, PageConfig, PlanContext, RequestOutcome, StepConfig} from '@pages/SimplifiedBankOnboarding/core';
import {createTextField, getFormPage, getRequestKey} from '@pages/SimplifiedBankOnboarding/core';
import type {RequestState} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {saveDraft} from '@pages/SimplifiedBankOnboarding/flows/shared/draft';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import Onyx from 'react-native-onyx';

const POLICY_ID = '1';
const COMPANY_STEP_ID = 'company';
const OWNER_STEP_ID = 'owner';

const PAGE_IDS = {
    COMPANY_NAME: 'name',
    COMPANY_TAX_ID: 'taxID',
    COMPANY_CONFIRMATION: 'confirmation',
    OWNER_NAME: 'ownerName',
} as const;

const LABELS = {
    COMPANY_NAME: 'Company name',
    COMPANY_TAX_ID: 'Tax ID',
    COMPANY_CONFIRMATION: 'Check the company',
    OWNER_NAME: 'Owner first name',
} as const;

const COMPANY_REQUEST_KEY = getRequestKey('saveCompany', {policyID: POLICY_ID});

const POSITIONS = {
    COMPANY_NAME: {stepID: COMPANY_STEP_ID, pageID: PAGE_IDS.COMPANY_NAME, isEditing: false},
    COMPANY_NAME_EDIT: {stepID: COMPANY_STEP_ID, pageID: PAGE_IDS.COMPANY_NAME, isEditing: true},
    COMPANY_TAX_ID: {stepID: COMPANY_STEP_ID, pageID: PAGE_IDS.COMPANY_TAX_ID, isEditing: false},
    COMPANY_CONFIRMATION: {stepID: COMPANY_STEP_ID, pageID: PAGE_IDS.COMPANY_CONFIRMATION, isEditing: false},
    OWNER_NAME: {stepID: OWNER_STEP_ID, pageID: PAGE_IDS.OWNER_NAME, isEditing: false},
} as const satisfies Record<string, FlowPosition>;

/** Every position gets its own route, so a test can tell from a navigation call where the controller went */
const TEST_ROUTES: FlowRoutes = {
    getPositionRoute: ({stepID, pageID, isEditing}) =>
        ROUTES.SETTINGS_BANK_ONBOARDING_LAB_USD_SETUP.getRoute({policyID: POLICY_ID, page: stepID, subPage: pageID, action: isEditing ? 'edit' : undefined}),
    exit: () => {},
};

type StepRequestAnswer = {status: 'succeeded'} | {status: 'failed'; errorMessage: string};

type TestFlow = {
    flow: FlowDescriptor<OnboardingDraft>;

    /** Called each time the controller sends the step request of the company step */
    sendCompanyRequest: jest.Mock<Promise<RequestOutcome>, []>;

    /** Settles the company request that waits for an answer, the way the server answer of a real request does */
    answerCompanyRequest: (answer: StepRequestAnswer) => void;
};

function setCompanyRequestState(state: RequestState): Promise<void> {
    return Onyx.merge(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {[COMPANY_REQUEST_KEY]: state});
}

function getStepConfig(id: string, title: string, pages: PageConfig[], request?: StepConfig['request']): StepConfig {
    return {id, title, pages, request, isComplete: pages.every((page) => page.isComplete)};
}

function createTestFlow(): TestFlow {
    const waitingAnswers: Array<(answer: StepRequestAnswer) => void> = [];

    // Like a planned request, it records its state under its key, so the page shows it as pending and then shows its error
    const sendCompanyRequest = jest.fn(async (): Promise<RequestOutcome> => {
        const requestID = String(sendCompanyRequest.mock.calls.length);
        await setCompanyRequestState({requestID, status: 'pending', errors: null});
        const answer = await new Promise<StepRequestAnswer>((resolve) => {
            waitingAnswers.push(resolve);
        });
        if (answer.status === 'failed') {
            await setCompanyRequestState({requestID, status: 'failed', errors: {[requestID]: answer.errorMessage}});
            return {status: 'failed'};
        }
        await setCompanyRequestState({requestID, status: 'succeeded', errors: null});
        return {status: 'succeeded'};
    });

    const answerCompanyRequest = (answer: StepRequestAnswer) => {
        const resolveAnswer = waitingAnswers.shift();
        if (!resolveAnswer) {
            throw new Error('The company request was not sent, so there is nothing to answer');
        }
        resolveAnswer(answer);
    };

    const buildPlan = (answers: OnboardingDraft, {translate}: PlanContext): FlowPlan => {
        const companyPages: PageConfig[] = [
            getFormPage({id: PAGE_IDS.COMPANY_NAME, title: LABELS.COMPANY_NAME, fields: [createTextField('companyName', {label: LABELS.COMPANY_NAME})]}, answers, translate),
            getFormPage({id: PAGE_IDS.COMPANY_TAX_ID, title: LABELS.COMPANY_TAX_ID, fields: [createTextField('companyTaxID', {label: LABELS.COMPANY_TAX_ID})]}, answers, translate),
            {kind: 'confirmation', id: PAGE_IDS.COMPANY_CONFIRMATION, title: LABELS.COMPANY_CONFIRMATION, isComplete: true},
        ];
        const ownerPages: PageConfig[] = [
            getFormPage({id: PAGE_IDS.OWNER_NAME, title: LABELS.OWNER_NAME, fields: [createTextField('ownerFirstName', {label: LABELS.OWNER_NAME})]}, answers, translate),
        ];

        return {
            answers,
            steps: [getStepConfig(COMPANY_STEP_ID, 'Company', companyPages, {key: COMPANY_REQUEST_KEY, send: sendCompanyRequest}), getStepConfig(OWNER_STEP_ID, 'Owner', ownerPages)],
        };
    };

    return {
        flow: {wrapperID: 'TestFlow', formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, saveDraft, buildPlan},
        sendCompanyRequest,
        answerCompanyRequest,
    };
}

export default createTestFlow;
export {COMPANY_REQUEST_KEY, LABELS, POLICY_ID, POSITIONS, TEST_ROUTES};
export type {TestFlow};
