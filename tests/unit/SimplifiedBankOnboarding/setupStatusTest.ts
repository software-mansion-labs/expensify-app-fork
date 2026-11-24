import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {
    areCompanyDetailsLocked,
    areSignersKnown,
    belongsToPolicy,
    hasBankAccount,
    hasInProgressSetup,
    isConnected,
    isGlobalAccountCreated,
} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';

const POLICY_ID = '1';

describe('setupStatus', () => {
    it('ties the account data to a workspace only when it carries that workspace', () => {
        // Given account data read for one workspace
        const achData = {policyID: POLICY_ID, bankAccountID: 7};

        // When it is compared with that workspace, another one and no workspace
        // Then only the same workspace matches, because every workspace shares the account key
        expect(belongsToPolicy(achData, POLICY_ID)).toBe(true);
        expect(belongsToPolicy(achData, '2')).toBe(false);
        expect(belongsToPolicy(achData, undefined)).toBe(false);
    });

    it('tells a connected account by the last step for USD and by the open state for NonUSD', () => {
        // Given a USD account on its last step and a NonUSD account that the review opened
        const usdAccount = {currentStep: SBO_CONST.USD.STEP.ENABLE};
        const nonUSDAccount = {state: SBO_CONST.STATE.OPEN};

        // When they are checked in their own currency and in the other one
        // Then each counts as connected only by the rule of its flow
        expect(isConnected(usdAccount, false)).toBe(true);
        expect(isConnected(usdAccount, true)).toBe(false);
        expect(isConnected(nonUSDAccount, true)).toBe(true);
        expect(isConnected(nonUSDAccount, false)).toBe(false);
    });

    it('finds a setup in progress only for the workspace of the account data', () => {
        // Given a USD account that is not connected yet and a NonUSD account created on the server
        const usdAccount = {
            policyID: POLICY_ID,
            bankAccountID: 7,
            state: SBO_CONST.STATE.SETUP,
        };
        const nonUSDAccount = {
            policyID: POLICY_ID,
            bankAccountID: 8,
            created: '2026-01-01',
        };

        // When they are checked for their workspace, another workspace and a page opened by the bank account
        // Then a setup shows as in progress for its workspace and for a page without a workspace, never for another one
        expect(hasInProgressSetup(usdAccount, false, POLICY_ID)).toBe(true);
        expect(hasInProgressSetup(usdAccount, false, undefined)).toBe(true);
        expect(hasInProgressSetup(usdAccount, false, '2')).toBe(false);
        expect(hasInProgressSetup(nonUSDAccount, true, POLICY_ID)).toBe(true);
        expect(hasInProgressSetup({...usdAccount, state: SBO_CONST.STATE.OPEN}, false, POLICY_ID)).toBe(false);
    });

    it('tells whether the server created the bank account', () => {
        // Given account data before and after the bank step was saved
        // When they are checked
        // Then only saved data counts, for both flows
        expect(hasBankAccount(undefined)).toBe(false);
        expect(hasBankAccount({bankAccountID: 7})).toBe(true);
        expect(isGlobalAccountCreated({})).toBe(false);
        expect(isGlobalAccountCreated({created: '2026-01-01'})).toBe(true);
    });

    it('locks the company details once the server checked the company', () => {
        // Given a saved company in setup, in review and after the review
        const savedCompany = {bankAccountID: 7, companyName: 'Acme'};

        // When the lock is checked
        // Then the name and tax ID stay editable until the server has checked them
        expect(
            areCompanyDetailsLocked({
                ...savedCompany,
                state: SBO_CONST.STATE.SETUP,
            }),
        ).toBe(false);
        expect(
            areCompanyDetailsLocked({
                ...savedCompany,
                state: SBO_CONST.STATE.VERIFYING,
            }),
        ).toBe(false);
        expect(
            areCompanyDetailsLocked({
                ...savedCompany,
                state: SBO_CONST.STATE.PENDING,
            }),
        ).toBe(true);
        expect(
            areCompanyDetailsLocked({
                bankAccountID: 7,
                state: SBO_CONST.STATE.PENDING,
            }),
        ).toBe(false);
    });

    it('asks AUD for a second director even when the first one is known', () => {
        // Given the name of one director
        const corpay = {signerFullName: 'Alberta Charleson'};

        // When the signers are checked for a currency with one director and for AUD
        // Then AUD still waits for the second director
        expect(areSignersKnown(corpay, SBO_CONST.CURRENCY.EUR)).toBe(true);
        expect(areSignersKnown(corpay, SBO_CONST.CURRENCY.AUD)).toBe(false);
        expect(areSignersKnown({...corpay, secondSignerFullName: 'Bart Charleson'}, SBO_CONST.CURRENCY.AUD)).toBe(true);
        expect(areSignersKnown(undefined, SBO_CONST.CURRENCY.EUR)).toBe(false);
    });
});
