import {render} from '@testing-library/react-native';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {NonUSDFlowPage, USDFlowPage} from '@pages/SimplifiedBankOnboarding';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {StepID, USDStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {ACHData, CorpayData, USDStep} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type * as CoreModule from '@pages/SimplifiedBankOnboarding/core';
import {readFlowSteps, resolveFlowStep} from '@pages/SimplifiedBankOnboarding/core/flow/readFlowSteps';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type {ReactNode} from 'react';

import React from 'react';
import Onyx from 'react-native-onyx';

import {TEST_POLICY_ID} from '../../utils/BankOnboardingLabTestUtils';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

const mockReadChildren = jest.fn<void, [ReactNode]>();

// The test asks which step a flow page resumes at for the data that Onyx holds. So the flow shell is a stand-in that only
// hands over the steps of the page. The real shell and its URL handling have a test of their own.
jest.mock('@pages/SimplifiedBankOnboarding/core', () => ({
    ...jest.requireActual<typeof CoreModule>('@pages/SimplifiedBankOnboarding/core'),
    OnboardingFlow: ({children}: {children: ReactNode}) => {
        mockReadChildren(children);
        return null;
    },
}));

type USDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP>;
type NonUSDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the page never reads navigation, so an empty object stands in for the prop that the navigator gives
const usdNavigation = {} as USDFlowPageProps['navigation'];
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the page never reads navigation, so an empty object stands in for the prop that the navigator gives
const nonUSDNavigation = {} as NonUSDFlowPageProps['navigation'];

const {EUR, AUD} = SBO_CONST.CURRENCY;
const CREATED = '2026-01-01';

/** The corpay data of a setup that the server saved up to the signer step */
const SAVED_UP_TO_SIGNER: CorpayData = {
    companyName: 'Acme',
    anyIndividualOwn25PercentOrMore: false,
    beneficialOwners: [{uid: SBO_CONST.NON_USD.CURRENT_USER_KEY, fullName: 'Ada Lovelace', ownershipPercentage: '50'}],
    signerFullName: 'Ada Lovelace',
};

const ALL_AGREEMENTS_CHECKED: OnboardingDraft = {authorizedToBindClientToAgreement: true, agreeToTermsAndConditions: true, consentToPrivacyNotice: true};

const BANK_STATEMENT: OnboardingDraft = {bankStatement: [{name: 'statement.pdf', uri: 'file://statement.pdf'}]};

/** Saves what a flow page reads: the account, the draft, and the workspace that names the currency */
async function saveFlowData(achData: ACHData | undefined, draft: OnboardingDraft | undefined, currency: string) {
    await Onyx.multiSet({
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT]: achData ? {achData} : null,
        [ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT]: draft ?? null,
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES]: {
            [TEST_POLICY_ID]: {id: TEST_POLICY_ID, name: 'Acme', outputCurrency: currency, role: SBO_CONST.WORKSPACE_ROLE.ADMIN},
        },
    });
}

/** The step that the rendered flow page opens for a URL without a step */
function getResumedStep(): StepID | undefined {
    return resolveFlowStep(readFlowSteps(mockReadChildren.mock.calls.at(-1)?.[0]), undefined)?.id;
}

async function getUSDStep(achData: ACHData | undefined): Promise<StepID | undefined> {
    await saveFlowData(achData, undefined, SBO_CONST.CURRENCY.USD);
    render(
        <USDFlowPage
            route={{key: 'usd', name: SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP, params: {policyID: TEST_POLICY_ID}}}
            navigation={usdNavigation}
        />,
    );
    await waitForBatchedUpdatesWithAct();
    return getResumedStep();
}

async function getNonUSDStep(achData: ACHData | undefined, draft: OnboardingDraft | undefined, currency: string): Promise<StepID | undefined> {
    await saveFlowData(achData, draft, currency);
    render(
        <NonUSDFlowPage
            route={{key: 'nonUSD', name: SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP, params: {policyID: TEST_POLICY_ID}}}
            navigation={nonUSDNavigation}
        />,
    );
    await waitForBatchedUpdatesWithAct();
    return getResumedStep();
}

describe('the step that a flow resumes at', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    describe('USDFlowPage', () => {
        const {STEP, PAGE_NAMES} = SBO_CONST.USD;
        const REQUIRED_DOCUMENTS = [SBO_CONST.USD.KYB_DOCUMENT_TYPES.COMPANY_TAX_ID];

        it.each<[USDStep, USDStepID]>([
            [STEP.COUNTRY, PAGE_NAMES.COUNTRY],
            [STEP.BANK_ACCOUNT, PAGE_NAMES.BANK_ACCOUNT],
            [STEP.REQUESTOR, PAGE_NAMES.REQUESTOR],
            [STEP.COMPANY, PAGE_NAMES.COMPANY],
            [STEP.BENEFICIAL_OWNERS, PAGE_NAMES.BENEFICIAL_OWNERS],
            [STEP.ACH_CONTRACT, PAGE_NAMES.ACH_CONTRACT],
            [STEP.KYB_DOCS, PAGE_NAMES.KYB_DOCS],
            [STEP.VALIDATION, PAGE_NAMES.VALIDATION],
        ])('opens the step of the server step %s', async (serverStep, expectedStep) => {
            // Given a setup that the server stored at this step, with no skipped step
            // When the flow opens without a step in the URL
            const step = await getUSDStep({currentStep: serverStep, requiredKYBDocuments: REQUIRED_DOCUMENTS});

            // Then it opens the step of the server, so the user continues where the server stopped
            expect(step).toBe(expectedStep);
        });

        it('opens personal info for the server step of the identity check', async () => {
            // Given a finished identity check while the server still stores the step that both steps share
            // When the flow opens without a step in the URL
            const step = await getUSDStep({currentStep: STEP.REQUESTOR, isOnfidoSetupComplete: true});

            // Then it opens personal info, because the identity check is only reached through it
            expect(step).toBe(PAGE_NAMES.REQUESTOR);
        });

        it('opens validation when the server stored the document step and asks for no document', async () => {
            // Given a server step of the documents and no required document, so the flow skips that step
            // When the flow opens without a step in the URL
            const step = await getUSDStep({currentStep: STEP.KYB_DOCS});

            // Then it opens validation, the next step that is not skipped
            expect(step).toBe(PAGE_NAMES.VALIDATION);
        });

        it('opens the first step when the server stored no step', async () => {
            // Given no account data at all, as for a new setup
            // When the flow opens without a step in the URL
            const step = await getUSDStep(undefined);

            // Then it opens the country step, which starts every setup
            expect(step).toBe(PAGE_NAMES.COUNTRY);
        });

        it('opens the first step when the server step has no step of the flow', async () => {
            // Given an account that the server already enabled, a step that no page of the flow shows
            // When the flow opens without a step in the URL
            const step = await getUSDStep({currentStep: STEP.ENABLE});

            // Then it falls back to the country step, as the entry did before
            expect(step).toBe(PAGE_NAMES.COUNTRY);
        });
    });

    describe('NonUSDFlowPage', () => {
        const {PAGE_NAMES} = SBO_CONST.NON_USD;

        it('opens the country step of a new setup', async () => {
            // Given no account and no picked country
            // When the flow opens without a step in the URL
            const step = await getNonUSDStep(undefined, undefined, EUR);

            // Then it opens the first step, as the old flow page did for a URL without a step
            expect(step).toBe(PAGE_NAMES.COUNTRY);
        });

        it('opens the bank step once a country was picked and the account does not exist yet', async () => {
            // Given a picked country in the draft and no account on the server (rule 1)
            // When the flow opens without a step in the URL
            const step = await getNonUSDStep(undefined, {country: 'DE'}, EUR);

            // Then it opens the bank step, the next step after the country
            expect(step).toBe(PAGE_NAMES.BANK_INFO);
        });

        it('opens business info once the account exists and the company was not saved', async () => {
            // Given an account created by the bank step and no company name (rule 2)
            // When the flow opens without a step in the URL
            const step = await getNonUSDStep({created: CREATED, corpay: {}}, undefined, EUR);

            // Then it opens business info
            expect(step).toBe(PAGE_NAMES.BUSINESS_INFO);
        });

        it('opens the owners step once the company was saved and the owners were not', async () => {
            // Given a saved company and no saved owners answer (rule 3)
            // When the flow opens without a step in the URL
            const step = await getNonUSDStep({created: CREATED, corpay: {companyName: 'Acme'}}, undefined, EUR);

            // Then it opens the owners step
            expect(step).toBe(PAGE_NAMES.BENEFICIAL_OWNER_INFO);
        });

        it('passes over the owners step of a setup with an empty company name', async () => {
            // Given a company saved with an empty name and no saved owners answer (rule 3 asks for a name)
            // When the flow opens without a step in the URL
            const step = await getNonUSDStep({created: CREATED, corpay: {companyName: ''}}, undefined, EUR);

            // Then it opens the signer step, as the real flow does for such a setup
            expect(step).toBe(PAGE_NAMES.SIGNER_INFO);
        });

        it('opens the signer step while no director is known', async () => {
            // Given saved owners and no saved director (rule 4)
            // When the flow opens without a step in the URL
            const step = await getNonUSDStep({created: CREATED, corpay: {companyName: 'Acme', anyIndividualOwn25PercentOrMore: false}}, undefined, EUR);

            // Then it opens the signer step
            expect(step).toBe(PAGE_NAMES.SIGNER_INFO);
        });

        it('opens the signer step of an AUD setup while the second director is not known', async () => {
            // Given an AUD setup with only the first director saved (rule 4, AUD needs both directors)
            // When the flow opens without a step in the URL
            const step = await getNonUSDStep({created: CREATED, corpay: SAVED_UP_TO_SIGNER}, undefined, AUD);

            // Then it opens the signer step, which waits for the second director
            expect(step).toBe(PAGE_NAMES.SIGNER_INFO);
        });

        it('opens the signer step when the agreements were saved but the setup was not sent', async () => {
            // Given known directors and saved agreements, but a state that is not VERIFYING (rule 4, saved agreements)
            // When the flow opens without a step in the URL
            const step = await getNonUSDStep({created: CREATED, corpay: {...SAVED_UP_TO_SIGNER, authorizedToBindClientToAgreement: true}}, undefined, EUR);

            // Then it opens the signer step, as the real flow does
            expect(step).toBe(PAGE_NAMES.SIGNER_INFO);
        });

        it('opens the finish step once the setup was sent', async () => {
            // Given a setup in VERIFYING, which counts as past the signer step (rule 5)
            // When the flow opens without a step in the URL
            const step = await getNonUSDStep({created: CREATED, state: SBO_CONST.STATE.VERIFYING, corpay: {companyName: 'Acme', anyIndividualOwn25PercentOrMore: false}}, undefined, EUR);

            // Then it opens the finish step
            expect(step).toBe(PAGE_NAMES.FINISH);
        });

        it('opens docusign when an AUD setup has the agreements checked and a bank statement picked', async () => {
            // Given both AUD directors known, every agreement checked and a bank statement in the draft (rule 6)
            const achData: ACHData = {created: CREATED, corpay: {...SAVED_UP_TO_SIGNER, secondSignerFullName: 'Grace Hopper'}};

            // When the flow opens without a step in the URL
            const step = await getNonUSDStep(achData, {...ALL_AGREEMENTS_CHECKED, ...BANK_STATEMENT}, AUD);

            // Then it opens docusign, the step after the agreements
            expect(step).toBe(PAGE_NAMES.DOCUSIGN);
        });

        it('opens the agreements of an AUD setup without a picked bank statement', async () => {
            // Given both AUD directors known and every agreement checked, but no bank statement (rule 7)
            const achData: ACHData = {created: CREATED, corpay: {...SAVED_UP_TO_SIGNER, secondSignerFullName: 'Grace Hopper'}};

            // When the flow opens without a step in the URL
            const step = await getNonUSDStep(achData, ALL_AGREEMENTS_CHECKED, AUD);

            // Then it opens the agreements, where the bank statement is picked
            expect(step).toBe(PAGE_NAMES.AGREEMENTS);
        });

        it('opens the agreements when a currency needs no docusign', async () => {
            // Given a EUR setup with every agreement checked and a bank statement (rule 7, docusign is AUD only)
            // When the flow opens without a step in the URL
            const step = await getNonUSDStep({created: CREATED, corpay: SAVED_UP_TO_SIGNER}, {...ALL_AGREEMENTS_CHECKED, ...BANK_STATEMENT}, EUR);

            // Then it opens the agreements, because the flow has no docusign step
            expect(step).toBe(PAGE_NAMES.AGREEMENTS);
        });

        it('opens the agreements when one agreement is unchecked in the draft', async () => {
            // Given an AUD setup whose draft unchecked an agreement that the server holds as checked (rule 6, draft first)
            const achData: ACHData = {created: CREATED, corpay: {...SAVED_UP_TO_SIGNER, secondSignerFullName: 'Grace Hopper'}};

            // When the flow opens without a step in the URL
            const step = await getNonUSDStep(achData, {...ALL_AGREEMENTS_CHECKED, ...BANK_STATEMENT, consentToPrivacyNotice: false}, AUD);

            // Then it opens the agreements, because the answer of the user wins over the saved one
            expect(step).toBe(PAGE_NAMES.AGREEMENTS);
        });
    });
});
