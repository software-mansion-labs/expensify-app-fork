/**
 * The Plaid page of the USD bank step. A fake widget keeps the real sequence of requests: a link token, which the
 * controller reads when the page opens, then a public token after the bank login, which the server exchanges for the
 * list of accounts. The page sends that exchange itself with the request that the plan gives it. The picked account goes
 * to the draft, and Next hands it to the controller, which sends the bank step. Once the server holds an account, the
 * page shows that account and Next only moves on.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Button from '@components/Button';
import FormProvider from '@components/Form/FormProvider';
import FormHelpMessage from '@components/FormHelpMessage';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import RadioButtons from '@components/RadioButtons';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLastFourDigits} from '@libs/BankAccountUtils';

import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {useRequest} from '@pages/SimplifiedBankOnboarding/core';
import {saveDraft} from '@pages/SimplifiedBankOnboarding/flows/shared/draft';
import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

type ConnectedPlaidAccount = {
    bankName: string;

    /** Masked by the server */
    accountNumber: string;
};

type PlaidStepProps = Pick<CustomStepProps, 'isSubmitting' | 'errorText' | 'onComplete'> & {
    /** Exchanges the public token of the bank login for the list of accounts */
    request: PlannedRequest<string>;

    /** An account was picked, so the bank step has an account to send */
    canComplete: boolean;

    /** The account that the server created. The page shows it instead of the list, because the bank step sends no other account then. */
    connectedAccount: ConnectedPlaidAccount | undefined;
};

const MOCK_PUBLIC_TOKEN = 'mock-public-token';

function PlaidStep({request, canComplete, connectedAccount, isSubmitting, errorText, onComplete}: PlaidStepProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [plaidData] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA);
    const {send: openBankAccountSelector, isPending: isLoadingBankAccounts, errorMessage: plaidErrorText} = useRequest(request);

    const plaidBankAccounts = plaidData?.bankAccounts ?? [];
    const selectedPlaidAccountID = draft?.plaidAccountID;

    const renderPlaidLink = () => {
        if (plaidErrorText) {
            return <Text style={[styles.formError, styles.mh5]}>{plaidErrorText}</Text>;
        }
        if (isLoadingBankAccounts) {
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
                    openBankAccountSelector(MOCK_PUBLIC_TOKEN);
                }}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.PLAID_LOGIN}
            >
                <Button.Text>[mock] Log in to the bank</Button.Text>
            </Button>
        );
    };

    if (!connectedAccount && !plaidBankAccounts.length) {
        return <FullPageOfflineBlockingView>{renderPlaidLink()}</FullPageOfflineBlockingView>;
    }

    return (
        <FullPageOfflineBlockingView>
            <FormProvider
                formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
                onSubmit={() => onComplete(connectedAccount ? undefined : {plaidAccountID: selectedPlaidAccountID})}
                submitButtonText={translate('common.next')}
                style={styles.flexGrow1}
                submitButtonStyles={styles.mh5}
                isSubmitDisabled={!canComplete}
                isLoading={isSubmitting}
                shouldHideFixErrorsAlert
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
            >
                <Text style={[styles.mh5, styles.mb3, styles.textHeadlineLineHeightXXL]}>{translate('bankAccount.chooseAnAccount')}</Text>
                {connectedAccount ? (
                    <MenuItemField
                        name={`${translate('bankAccount.accountEnding')} ${getLastFourDigits(connectedAccount.accountNumber)}`}
                        value={connectedAccount.bankName}
                        forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                    />
                ) : (
                    <>
                        <Text style={[styles.mh5, styles.mb6, styles.textSupporting]}>{translate('bankAccount.plaidBodyCopy')}</Text>
                        <RadioButtons
                            items={plaidBankAccounts.map((bankAccount) => ({value: bankAccount.plaidAccountID, label: `${bankAccount.bankName} ${bankAccount.mask}`}))}
                            defaultCheckedValue={selectedPlaidAccountID}
                            onSelect={(plaidAccountID) => {
                                saveDraft({plaidAccountID});
                            }}
                        />
                    </>
                )}
                <FormHelpMessage
                    style={styles.mh5}
                    message={errorText}
                />
            </FormProvider>
        </FullPageOfflineBlockingView>
    );
}

export default PlaidStep;
