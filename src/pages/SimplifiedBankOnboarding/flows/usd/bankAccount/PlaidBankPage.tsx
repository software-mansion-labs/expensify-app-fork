/**
 * The Plaid variant of the USD bank step. A fake widget keeps the real sequence of requests: a link token when the page
 * opens, then a public token after the bank login, which the server exchanges for the list of accounts. The picked
 * account lives in the draft, like in the real step, and Next connects it. Like the real step it does not clear the Plaid
 * data when it closes.
 */
import Button from '@components/Button';
import RadioButtons from '@components/RadioButtons';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {FormSubPage, PageLoadingIndicator, useOnboardingFlow, useOnboardingRequest, useReadOnOpen, useFlowData} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import {connectWithPlaidRequest} from './bankAccountRequests';
import getBankAccountAnswers from './getBankAccountAnswers';
import {plaidAccountSelectorRead, plaidLoginRead} from './plaidRequests';

function PlaidBankPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {saveDraft} = useOnboardingFlow();
    const {plaidAccountID} = getBankAccountAnswers(useFlowData());
    const [plaidData] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA);
    const [plaidLinkToken] = useOnyx(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN);
    const accountSelector = useOnboardingRequest(plaidAccountSelectorRead);
    const loginRead = useReadOnOpen(plaidLoginRead);

    const plaidBankAccounts = plaidData?.bankAccounts ?? [];
    const plaidErrorMessage = loginRead.hasFailed ? translate('common.genericErrorMessage') : accountSelector.errorMessage;

    const logInToBank = () => {
        accountSelector.send();
    };

    const pickAccount = (selectedAccountID: string) => {
        saveDraft({plaidAccountID: selectedAccountID});
    };

    if (!plaidBankAccounts.length) {
        if (plaidErrorMessage) {
            return <Text style={[styles.formError, styles.mh5]}>{plaidErrorMessage}</Text>;
        }
        if (!plaidLinkToken || loginRead.isPending || accountSelector.isPending) {
            return <PageLoadingIndicator />;
        }
        return (
            <Button
                variant={CONST.BUTTON_VARIANT.SUCCESS}
                style={styles.mh5}
                onPress={logInToBank}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
            >
                <Button.Text>[mock] Log in to the bank</Button.Text>
            </Button>
        );
    }

    return (
        <FormSubPage
            title={translate('bankAccount.chooseAnAccount')}
            inputIDs={[]}
            request={connectWithPlaidRequest}
            getDraftUpdate={() => ({plaidAccountID})}
            isSubmitDisabled={!plaidAccountID}
            shouldHideFixErrorsAlert
        >
            <Text style={[styles.mt3, styles.mb6, styles.textSupporting]}>{translate('bankAccount.plaidBodyCopy')}</Text>
            <View style={styles.mhn5}>
                <RadioButtons
                    items={plaidBankAccounts.map((bankAccount) => ({
                        value: bankAccount.plaidAccountID,
                        label: `${bankAccount.bankName} ${bankAccount.mask}`,
                    }))}
                    defaultCheckedValue={plaidAccountID}
                    onSelect={pickAccount}
                />
            </View>
        </FormSubPage>
    );
}

export default PlaidBankPage;
