import {render, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';

import Navigation from '@libs/Navigation/Navigation';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {EnterSignerInfoPage, NonUSDFlowPage, USDFlowPage} from '@pages/SimplifiedBankOnboarding';
import type {OnboardingAccount, Workspaces} from '@pages/SimplifiedBankOnboarding';
import type {NonUSDStepID, StepID, USDStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';

import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({key: 'current-route', name: 'CurrentScreen'}),
    useNavigation: () => ({getState: () => ({routes: []})}),
    useNavigationState: <TResult,>(selector: (state: {routes: []}) => TResult) => selector({routes: []}),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    dismissModal: jest.fn(),
}));

jest.mock('@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage', () => ({
    __esModule: true,
    default: jest.fn(() => Promise.resolve({status: 'succeeded'})),
    getAccountLoadingData: jest.fn(() => ({})),
}));

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack. The stand-in prints what the step gives it: the screen, the title and the counter.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({wrapperID, headerTitle, startStepIndex, stepNames}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => (
        <RN.View>
            <RN.Text>{`screen ${wrapperID}`}</RN.Text>
            <RN.Text>{`title ${headerTitle}`}</RN.Text>
            <RN.Text>{`counter ${startStepIndex ?? 'none'} of ${stepNames?.join(',') ?? 'none'}`}</RN.Text>
        </RN.View>
    );
});

const POLICY_ID = '1';
const {CURRENCY, STATE, USD, NON_USD} = SBO_CONST;

type USDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP>;
type NonUSDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;
type EnterSignerInfoPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTER_SIGNER_INFO>;

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the page never reads navigation, so an empty object stands in for the prop that the navigator gives
const usdNavigation = {} as USDFlowPageProps['navigation'];
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the page never reads navigation, so an empty object stands in for the prop that the navigator gives
const nonUSDNavigation = {} as NonUSDFlowPageProps['navigation'];
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the page never reads navigation, so an empty object stands in for the prop that the navigator gives
const enterSignerInfoNavigation = {} as EnterSignerInfoPageProps['navigation'];

/** An account of the route's workspace, so the account gate of the flow shows the step without a read */
function getAccount(achData: NonNullable<OnboardingAccount['achData']>): OnboardingAccount {
    return {achData: {policyID: POLICY_ID, bankAccountID: 5, ...achData}};
}

function getWorkspaces(outputCurrency: string): Workspaces {
    return {[POLICY_ID]: {id: POLICY_ID, name: 'Workspace', outputCurrency, role: SBO_CONST.WORKSPACE_ROLE.ADMIN}};
}

async function setOnyxData(account: OnboardingAccount, workspaces?: Workspaces) {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, account);
    if (workspaces) {
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, workspaces);
    }
    await waitForBatchedUpdatesWithAct();
}

async function renderUSDFlow(page?: USDStepID) {
    render(
        <USDFlowPage
            route={{key: 'usd', name: SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP, params: {policyID: POLICY_ID, page}}}
            navigation={usdNavigation}
        />,
    );
    await waitForBatchedUpdatesWithAct();
}

async function renderNonUSDFlow(page?: NonUSDStepID) {
    render(
        <NonUSDFlowPage
            route={{key: 'nonUSD', name: SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP, params: {policyID: POLICY_ID, page}}}
            navigation={nonUSDNavigation}
        />,
    );
    await waitForBatchedUpdatesWithAct();
}

function expectStep(wrapperID: string, title: string, counter: string) {
    expect(screen.getByText(`screen ${wrapperID}`)).toBeOnTheScreen();
    expect(screen.getByText(`title ${title}`)).toBeOnTheScreen();
    expect(screen.getByText(`counter ${counter}`)).toBeOnTheScreen();
}

/** The flow shows `step` on the route of another URL step, and the step shell writes it with its start page in one write */
function expectShownInPlace(step: StepID, wrapperID: string) {
    expect(screen.getByText(`screen ${wrapperID}`)).toBeOnTheScreen();
    expect(Navigation.setParams).toHaveBeenCalledTimes(1);
    expect(Navigation.setParams).toHaveBeenCalledWith(expect.objectContaining({page: step, action: undefined, returnTo: undefined}), 'current-route');
    expect(Navigation.navigate).not.toHaveBeenCalled();
}

describe('flow pages', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    describe('USDFlowPage', () => {
        const USD_COUNTER = '1,2,3,4,5,6,7';

        it.each<[USDStepID, string, string, string]>([
            [USD.PAGE_NAMES.COUNTRY, 'SimplifiedBankOnboardingCountry', 'countryStep.confirmCurrency', `0 of ${USD_COUNTER}`],
            [USD.PAGE_NAMES.BANK_ACCOUNT, 'SimplifiedBankOnboardingBankInfo', 'bankAccount.bankInfo', `1 of ${USD_COUNTER}`],
            [USD.PAGE_NAMES.REQUESTOR, 'SimplifiedBankOnboardingPersonalInfo', 'personalInfoStep.personalInfo', `2 of ${USD_COUNTER}`],
            [USD.PAGE_NAMES.VERIFY_IDENTITY, 'SimplifiedBankOnboardingVerifyIdentity', 'onfidoStep.verifyIdentity', `2 of ${USD_COUNTER}`],
            [USD.PAGE_NAMES.COMPANY, 'SimplifiedBankOnboardingBusinessInfo', 'businessInfoStep.businessInfo', `3 of ${USD_COUNTER}`],
            [USD.PAGE_NAMES.BENEFICIAL_OWNERS, 'SimplifiedBankOnboardingBeneficialOwners', 'beneficialOwnerInfoStep.companyOwner', `4 of ${USD_COUNTER}`],
            [USD.PAGE_NAMES.ACH_CONTRACT, 'SimplifiedBankOnboardingCompleteVerification', 'completeVerificationStep.completeVerification', `5 of ${USD_COUNTER}`],
            [USD.PAGE_NAMES.KYB_DOCS, 'SimplifiedBankOnboardingKYBDocuments', 'documentsStep.subheader', 'none of none'],
            [USD.PAGE_NAMES.VALIDATION, 'SimplifiedBankOnboardingConnectBankAccount', 'bankAccount.addBankAccount', `6 of ${USD_COUNTER}`],
        ])('opens the %s step with its screen, title and counter', async (step, wrapperID, title, counter) => {
            // Given a setup where no step is skipped: the identity check is not done and documents are required
            await setOnyxData(getAccount({requiredKYBDocuments: [USD.KYB_DOCUMENT_TYPES.COMPANY_TAX_ID]}));

            // When the URL names the step
            await renderUSDFlow(step);

            // Then the step shows its screen and title, and the counter puts the identity check on the number of
            // personal info and gives the documents no number, as the real flow does (USD-13)
            expectStep(wrapperID, title, counter);
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('titles the validation step for the test deposits when the account is pending', async () => {
            // Given an account that waits for the test deposit amounts
            await setOnyxData(getAccount({state: STATE.PENDING}));

            // When the validation step opens
            await renderUSDFlow(USD.PAGE_NAMES.VALIDATION);

            // Then the title asks the user to validate the account
            expect(screen.getByText('title connectBankAccountStep.validateYourBankAccount')).toBeOnTheScreen();
        });

        it('skips the identity check once the server finished it', async () => {
            // Given an identity check that the server finished
            await setOnyxData(getAccount({isOnfidoSetupComplete: true}));

            // When the URL names the identity check
            await renderUSDFlow(USD.PAGE_NAMES.VERIFY_IDENTITY);

            // Then the flow shows the next step that is not skipped
            expectShownInPlace(USD.PAGE_NAMES.COMPANY, 'SimplifiedBankOnboardingBusinessInfo');
        });

        it('skips the document step when no document is required', async () => {
            // Given a verification that asks for no documents
            await setOnyxData(getAccount({}));

            // When the URL names the document step
            await renderUSDFlow(USD.PAGE_NAMES.KYB_DOCS);

            // Then the flow shows validation, the next step
            expectShownInPlace(USD.PAGE_NAMES.VALIDATION, 'SimplifiedBankOnboardingConnectBankAccount');
        });

        it('opens the step that the server stored when the URL names none', async () => {
            // Given a setup that the server stored at the company step
            await setOnyxData(getAccount({currentStep: USD.STEP.COMPANY}));

            // When the flow opens without a step
            await renderUSDFlow();

            // Then it resumes at business info
            expectShownInPlace(USD.PAGE_NAMES.COMPANY, 'SimplifiedBankOnboardingBusinessInfo');
        });
    });

    describe('NonUSDFlowPage', () => {
        const AUD_COUNTER = '1,2,3,4,5,6,7';

        it.each<[NonUSDStepID, string, string, string]>([
            [NON_USD.PAGE_NAMES.COUNTRY, 'SimplifiedBankOnboardingCountry', 'countryStep.confirmCurrency', `0 of ${AUD_COUNTER}`],
            [NON_USD.PAGE_NAMES.BANK_INFO, 'SimplifiedBankOnboardingBankInfo', 'bankAccount.bankInfo', `1 of ${AUD_COUNTER}`],
            [NON_USD.PAGE_NAMES.BUSINESS_INFO, 'SimplifiedBankOnboardingBusinessInfo', 'businessInfoStep.businessInfoTitle', `2 of ${AUD_COUNTER}`],
            [NON_USD.PAGE_NAMES.BENEFICIAL_OWNER_INFO, 'SimplifiedBankOnboardingBeneficialOwnerInfo', 'ownershipInfoStep.ownerInfo', `3 of ${AUD_COUNTER}`],
            [NON_USD.PAGE_NAMES.SIGNER_INFO, 'SimplifiedBankOnboardingSignerInfo', 'signerInfoStep.signerInfo', `4 of ${AUD_COUNTER}`],
            [NON_USD.PAGE_NAMES.AGREEMENTS, 'SimplifiedBankOnboardingAgreements', 'agreementsStep.agreements', `5 of ${AUD_COUNTER}`],
            [NON_USD.PAGE_NAMES.DOCUSIGN, 'SimplifiedBankOnboardingDocusign', 'docusignStep.subheader', `6 of ${AUD_COUNTER}`],
            [NON_USD.PAGE_NAMES.FINISH, 'SimplifiedBankOnboardingFinish', 'bankAccount.addBankAccount', 'none of none'],
        ])('opens the %s step of an AUD workspace with its screen, title and counter', async (step, wrapperID, title, counter) => {
            // Given an AUD workspace, whose flow has the docusign step
            await setOnyxData(getAccount({}), getWorkspaces(CURRENCY.AUD));

            // When the URL names the step
            await renderNonUSDFlow(step);

            // Then the step shows its screen, its title and its place in the counter, and finish has no number
            expectStep(wrapperID, title, counter);
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('counts six steps without docusign for a currency that needs no docusign', async () => {
            // Given a EUR workspace
            await setOnyxData(getAccount({}), getWorkspaces(CURRENCY.EUR));

            // When the agreements open
            await renderNonUSDFlow(NON_USD.PAGE_NAMES.AGREEMENTS);

            // Then the agreements are the last numbered step of six
            expectStep('SimplifiedBankOnboardingAgreements', 'agreementsStep.agreements', '5 of 1,2,3,4,5,6');
        });

        it('skips docusign for a currency that needs no docusign', async () => {
            // Given a EUR workspace
            await setOnyxData(getAccount({}), getWorkspaces(CURRENCY.EUR));

            // When the URL names docusign
            await renderNonUSDFlow(NON_USD.PAGE_NAMES.DOCUSIGN);

            // Then the flow shows finish, the next step
            expectShownInPlace(NON_USD.PAGE_NAMES.FINISH, 'SimplifiedBankOnboardingFinish');
        });

        it('opens the step that the saved data points to when the URL names none', async () => {
            // Given an account that the bank step created, without a saved company
            await setOnyxData(getAccount({created: '2026-01-01', corpay: {}}), getWorkspaces(CURRENCY.EUR));

            // When the flow opens without a step
            await renderNonUSDFlow();

            // Then it resumes at business info
            expectShownInPlace(NON_USD.PAGE_NAMES.BUSINESS_INFO, 'SimplifiedBankOnboardingBusinessInfo');
        });
    });

    describe('EnterSignerInfoPage', () => {
        it('opens the one step of the invited director without a counter', async () => {
            // Given a link of an invited director, which names no step
            // When the page opens
            render(
                <EnterSignerInfoPage
                    route={{key: 'signer', name: SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTER_SIGNER_INFO, params: {policyID: POLICY_ID, bankAccountID: '5'}}}
                    navigation={enterSignerInfoNavigation}
                />,
            );
            await waitForBatchedUpdatesWithAct();

            // Then the director step opens on its own screen, with no counter and no redirect
            expectStep('SimplifiedBankOnboardingEnterSignerInfo', 'signerInfoStep.signerInfo', 'none of none');
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });
    });
});
