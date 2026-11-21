/**
 * The Plaid page of the USD bank step. A fake widget keeps the real sequence of requests: a link token on mount and
 * again after a reconnect, then a public token after the bank login, which the server exchanges for the list of
 * accounts. The picked account goes to the draft, and Next hands it to the controller, which sends the bank step.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Button from '@components/Button';
import FormProvider from '@components/Form/FormProvider';
import FormHelpMessage from '@components/FormHelpMessage';
import RadioButtons from '@components/RadioButtons';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/core';
import {useRequestState} from '@pages/SimplifiedBankOnboarding/core';
import {saveDraft} from '@pages/SimplifiedBankOnboarding/flows/shared/draft';
import {openPlaidBankAccountSelector, openPlaidBankLogin} from '@pages/SimplifiedBankOnboarding/flows/usd/requests/plaid';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React, {useEffect} from 'react';
import {View} from 'react-native';

type PlaidStepProps = Pick<CustomStepProps, 'isSubmitting' | 'errorText' | 'onComplete'> & {
    /** An account was picked, so the bank step has an account to send */
    canComplete: boolean;
};

const MOCK_PUBLIC_TOKEN = 'mock-public-token';

function PlaidStep({canComplete, isSubmitting, errorText, onComplete}: PlaidStepProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [plaidData] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA);
    const [plaidLinkToken] = useOnyx(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN);
    const linkTokenRequest = useRequestState(REQUEST_NAMES.OPEN_PLAID_BANK_LOGIN);
    const accountsRequest = useRequestState(REQUEST_NAMES.OPEN_PLAID_BANK_ACCOUNT_SELECTOR);

    // A read made offline is dropped, so the token is asked for again once the connection is back
    useNetwork({
        onReconnect: () => {
            openPlaidBankLogin();
        },
    });

    useEffect(() => {
        openPlaidBankLogin();
    }, []);

    const plaidBankAccounts = plaidData?.bankAccounts ?? [];
    const selectedPlaidAccountID = draft?.plaidAccountID;
    const plaidErrorText = getLatestErrorMessage({errors: linkTokenRequest.errors ?? accountsRequest.errors});

    const renderPlaidLink = () => {
        if (plaidErrorText) {
            return <Text style={[styles.formError, styles.mh5]}>{plaidErrorText}</Text>;
        }
        if (!plaidLinkToken || linkTokenRequest.isPending || accountsRequest.isPending) {
            return (
                <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter]}>
                    <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                </View>
            );
        }
        return (
            <Button
                variant={CONST.BUTTON_VARIANT.SUCCESS}
                style={styles.mh5}
                onPress={() => {
                    openPlaidBankAccountSelector(MOCK_PUBLIC_TOKEN);
                }}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.PLAID_LOGIN}
            >
                <Button.Text>[mock] Log in to the bank</Button.Text>
            </Button>
        );
    };

    if (!plaidBankAccounts.length) {
        return <FullPageOfflineBlockingView>{renderPlaidLink()}</FullPageOfflineBlockingView>;
    }

    return (
        <FullPageOfflineBlockingView>
            <FormProvider
                formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
                onSubmit={() => onComplete({plaidAccountID: selectedPlaidAccountID})}
                submitButtonText={translate('common.next')}
                style={styles.flexGrow1}
                submitButtonStyles={styles.mh5}
                isSubmitDisabled={!canComplete}
                isLoading={isSubmitting}
                shouldHideFixErrorsAlert
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
            >
                <Text style={[styles.mh5, styles.mb3, styles.textHeadlineLineHeightXXL]}>{translate('bankAccount.chooseAnAccount')}</Text>
                <Text style={[styles.mh5, styles.mb6, styles.textSupporting]}>{translate('bankAccount.plaidBodyCopy')}</Text>
                <RadioButtons
                    items={plaidBankAccounts.map((bankAccount) => ({value: bankAccount.plaidAccountID, label: `${bankAccount.bankName} ${bankAccount.mask}`}))}
                    defaultCheckedValue={selectedPlaidAccountID}
                    onSelect={(plaidAccountID) => {
                        saveDraft({plaidAccountID});
                    }}
                />
                <FormHelpMessage
                    style={styles.mh5}
                    message={errorText}
                />
            </FormProvider>
        </FullPageOfflineBlockingView>
    );
}

export default PlaidStep;
