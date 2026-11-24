import {fireEvent, render, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import Navigation from '@libs/Navigation/Navigation';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {NonUSDFlowPage} from '@pages/SimplifiedBankOnboarding';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {BankFields} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {clearRequestState} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import PAGES from '@pages/SimplifiedBankOnboarding/flows/nonUSD/bankInfo/bankInfoPages';
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import {getBankFormFields} from '@pages/SimplifiedBankOnboarding/mockBackend/serverCatalog';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';
import type {OnyxData} from '@src/types/onyx/Request';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';
import type {OnyxKey} from 'react-native-onyx';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({key: 'current-route', name: 'CurrentScreen'}),
    useNavigation: () => ({
        getState: () => ({routes: []}),
        isFocused: () => true,
        addListener: () => () => {},
    }),
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

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({
    read: jest.fn(),
    write: jest.fn(),
}));

jest.mock('@pages/ErrorPage/NotFoundPage', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return () => <RN.Text>not found</RN.Text>;
});

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack. The stand-in renders the content of the step.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({children}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => <RN.View>{children}</RN.View>;
});

type NonUSDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;

// The flow page does not read navigation; this inert test double only satisfies the navigator-provided prop.
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const navigation = {} as NonUSDFlowPageProps['navigation'];

const POLICY_ID = '1';
const GERMAN_FIELDS = getBankFormFields(SBO_CONST.COUNTRY.DE) ?? [];
const VALID_IBAN = 'DE89370400440532013000';

type ServerAnswer = 'success' | 'failure';

/** Applies the data of a fields read the way the mock API does: the server sets the key, then the status data follows */
function answerReads(answer: ServerAnswer) {
    jest.mocked(read).mockImplementation((_command, params, onyxData: OnyxData<OnyxKey> = {}) => {
        const countryISO = 'countryISO' in params ? params.countryISO : '';
        const serverUpdate =
            answer === 'success'
                ? Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS, {
                      bankCountry: countryISO,
                      bankCurrency: 'EUR',
                      formFields: GERMAN_FIELDS,
                  })
                : Promise.resolve();
        Onyx.update(onyxData.optimisticData ?? [])
            .then(() => serverUpdate)
            .then(() => Onyx.update(answer === 'success' ? (onyxData.successData ?? []) : (onyxData.failureData ?? [])))
            .then(() => Onyx.update(onyxData.finallyData ?? []));
    });
}

type SetupOptions = {
    bankFields?: BankFields;
    draft?: OnboardingDraft;
};

/** A EUR workspace whose account was read for Germany, so the gate of the flow shows the step without a read */
async function setUpAccount({bankFields, draft}: SetupOptions = {}) {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
        achData: {
            policyID: POLICY_ID,
            bankAccountID: 5,
            country: SBO_CONST.COUNTRY.DE,
        },
    });
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {
        [POLICY_ID]: {
            id: POLICY_ID,
            name: 'Workspace',
            outputCurrency: SBO_CONST.CURRENCY.EUR,
            role: SBO_CONST.WORKSPACE_ROLE.ADMIN,
        },
    });
    if (bankFields) {
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS, bankFields);
    }
    if (draft) {
        await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, draft);
    }
    await waitForBatchedUpdatesWithAct();
}

async function renderBankInfoStep(subPage?: string) {
    render(
        <OnyxListItemProvider>
            <NavigationContainer>
                <NonUSDFlowPage
                    route={{
                        key: 'nonUSD',
                        name: SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP,
                        params: {
                            policyID: POLICY_ID,
                            page: SBO_CONST.NON_USD.PAGE_NAMES.BANK_INFO,
                            subPage,
                        },
                    }}
                    navigation={navigation}
                />
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
    await waitForBatchedUpdatesWithAct();
}

const LOADED_GERMAN_FIELDS: BankFields = {
    bankCountry: SBO_CONST.COUNTRY.DE,
    bankCurrency: SBO_CONST.CURRENCY.EUR,
    formFields: GERMAN_FIELDS,
};

describe('BankInfoStep', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(read).mockReset();
        jest.mocked(write).mockReset();
        answerReads('success');
        await clearRequestState();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => clearRequestState());

    it('reads the inputs of its country when the key holds those of another country, and shows the bank inputs', async () => {
        // Given a key that holds the inputs of France, left there by another workspace
        await setUpAccount({
            bankFields: {
                bankCountry: SBO_CONST.COUNTRY.FR,
                bankCurrency: SBO_CONST.CURRENCY.EUR,
                formFields: getBankFormFields(SBO_CONST.COUNTRY.FR),
            },
        });

        // When the bank page opens
        await renderBankInfoStep(PAGES.BANK_ACCOUNT_DETAILS);

        // Then it asks for the German inputs in euros and shows the bank inputs of Germany, without the holder inputs
        expect(read).toHaveBeenCalledWith(READ_COMMANDS.GET_BANK_ACCOUNT_FIELDS, {countryISO: SBO_CONST.COUNTRY.DE, currency: SBO_CONST.CURRENCY.EUR}, expect.anything());
        expect(screen.getAllByLabelText('IBAN').length).toBeGreaterThan(0);
        expect(screen.queryAllByLabelText('Account holder name')).toHaveLength(0);
    });

    it('does not read when the key already holds the inputs of the account', async () => {
        // Given a key that holds the German inputs in euros
        await setUpAccount({bankFields: LOADED_GERMAN_FIELDS});

        // When the bank page opens
        await renderBankInfoStep(PAGES.BANK_ACCOUNT_DETAILS);

        // Then nothing is read, because the inputs in the key are the ones this account needs
        expect(read).not.toHaveBeenCalled();
    });

    it('shows the not found page when the server cannot describe the inputs', async () => {
        // Given a server that fails the read of the inputs
        answerReads('failure');
        await setUpAccount();

        // When the step opens
        await renderBankInfoStep(PAGES.BANK_ACCOUNT_DETAILS);

        // Then the user sees the not found page, because the step has no inputs to show
        expect(screen.getByText('not found')).toBeOnTheScreen();
    });

    it('resumes on the holder page when the bank inputs are valid and only the optional one is empty', async () => {
        // Given a valid IBAN and no SWIFT code, which is optional for Germany
        await setUpAccount({
            bankFields: LOADED_GERMAN_FIELDS,
            draft: {iban: VALID_IBAN},
        });

        // When the step opens without a page, as on a resume
        await renderBankInfoStep();

        // Then the holder page opens, because an empty optional input does not count as missing (BC-13)
        expect(Navigation.setParams).toHaveBeenCalledWith({subPage: PAGES.ACCOUNT_HOLDER_DETAILS}, 'current-route');
    });

    it('resumes on the bank page when a bank input breaks a rule of the server', async () => {
        // Given an IBAN that does not match the German rule
        await setUpAccount({
            bankFields: LOADED_GERMAN_FIELDS,
            draft: {
                iban: 'DE123',
                accountHolderName: 'Alberta',
                accountHolderCountry: 'DE',
            },
        });

        // When the step opens without a page
        await renderBankInfoStep();

        // Then the bank page opens, so the user fixes the value before the account is created
        expect(Navigation.setParams).toHaveBeenCalledWith({subPage: PAGES.BANK_ACCOUNT_DETAILS}, 'current-route');
    });

    it('shows the option text on the confirmation and sends every described input', async () => {
        // Given every required German input answered and the optional SWIFT code left empty
        await setUpAccount({
            bankFields: LOADED_GERMAN_FIELDS,
            draft: {
                iban: VALID_IBAN,
                swiftBicCode: '',
                accountHolderName: 'Alberta',
                accountHolderCountry: 'DE',
            },
        });
        await renderBankInfoStep(PAGES.CONFIRMATION);

        // When the user confirms
        expect(screen.getByText('Germany')).toBeOnTheScreen();
        fireEvent.press(screen.getByText('common.confirm'));
        await waitForBatchedUpdatesWithAct();

        // Then the account is created for the workspace with every input that the server described, the empty one as an empty text
        expect(write).toHaveBeenCalledWith(
            WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT,
            {
                policyID: POLICY_ID,
                country: SBO_CONST.COUNTRY.DE,
                currency: SBO_CONST.CURRENCY.EUR,
                fields: {
                    iban: VALID_IBAN,
                    swiftBicCode: '',
                    accountHolderName: 'Alberta',
                    accountHolderCountry: 'DE',
                },
            },
            expect.anything(),
        );
    });
});
