/**
 * The Plaid variant of the USD bank step. A fake widget keeps the real sequence of requests: a link token when the page
 * opens, then a public token after the bank login, which the server exchanges for the list of accounts. The picked
 * account lives in the draft, like in the real step, and Next connects it. Like the real step it does not clear the Plaid
 * data when it closes.
 */
import Button from '@components/Button';
import FormProvider from '@components/Form/FormProvider';
import RadioButtons from '@components/RadioButtons';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import {PageLoadingIndicator, RequestErrorMessage, useOnboardingFlow, useOnboardingRequest, useReadOnOpen, useSubPageSubmit} from '@pages/SimplifiedBankOnboarding/core';
import {useUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import {connectWithPlaidRequest} from './bankAccountRequests';
import {plaidAccountSelectorRead, plaidLoginRead} from './plaidRequests';

function PlaidBankPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {formID, saveDraft} = useOnboardingFlow();
    const {plaidAccountID} = useUSDAnswers();
    const [plaidData] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA);
    const [plaidLinkToken] = useOnyx(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN);
    const accountSelector = useOnboardingRequest(plaidAccountSelectorRead);
    const {submit, isPending, errorMessage} = useSubPageSubmit({request: connectWithPlaidRequest});
    useReadOnOpen(plaidLoginRead);

    const plaidBankAccounts = plaidData?.bankAccounts ?? [];
    const plaidErrorMessage = getLatestErrorMessage(plaidData);

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
        if (!plaidLinkToken || plaidData?.isLoading) {
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
        <FormProvider
            formID={formID}
            onSubmit={() => submit({plaidAccountID})}
            submitButtonText={translate('common.next')}
            style={styles.flexGrow1}
            submitButtonStyles={styles.mh5}
            isSubmitDisabled={!plaidAccountID}
            isLoading={isPending}
            shouldHideFixErrorsAlert
            footerContent={
                <View style={styles.mh5}>
                    <RequestErrorMessage message={errorMessage} />
                </View>
            }
            shouldRenderFooterAboveSubmit
            sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
        >
            <Text style={[styles.mh5, styles.mb3, styles.textHeadlineLineHeightXXL]}>{translate('bankAccount.chooseAnAccount')}</Text>
            <Text style={[styles.mh5, styles.mb6, styles.textSupporting]}>{translate('bankAccount.plaidBodyCopy')}</Text>
            <RadioButtons
                items={plaidBankAccounts.map((bankAccount) => ({value: bankAccount.plaidAccountID, label: `${bankAccount.bankName} ${bankAccount.mask}`}))}
                defaultCheckedValue={plaidAccountID}
                onSelect={pickAccount}
            />
        </FormProvider>
    );
}

export default PlaidBankPage;
