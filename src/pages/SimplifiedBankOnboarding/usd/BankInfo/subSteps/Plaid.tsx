/**
 * The Plaid variant of the USD bank step. A fake widget keeps the real sequence of requests: a link token on mount, a
 * public token after the bank login, which the server exchanges for the list of accounts. The picked account lives in the
 * form draft, like in the real step, and the container sends it. Like the real step it does not clear Plaid on unmount.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import Button from '@components/Button';
import FormProvider from '@components/Form/FormProvider';
import FormHelpMessage from '@components/FormHelpMessage';
import RadioButtons from '@components/RadioButtons';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import {updateOnboardingDraft} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import {openPlaidBankAccountSelector, openPlaidBankLogin} from '@pages/SimplifiedBankOnboarding/actions/Plaid';
import type BankInfoSubStepProps from '@pages/SimplifiedBankOnboarding/usd/BankInfo/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React, {useEffect} from 'react';
import {View} from 'react-native';

const MOCK_PUBLIC_TOKEN = 'mock-public-token';

function Plaid({onNext}: BankInfoSubStepProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [plaidData] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA);
    const [plaidLinkToken] = useOnyx(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN);

    const plaidBankAccounts = plaidData?.bankAccounts ?? [];
    const selectedPlaidAccountID = draft?.plaidAccountID;
    const plaidErrorMessage = getLatestErrorMessage(plaidData);

    useEffect(() => {
        openPlaidBankLogin();
    }, []);

    const renderPlaidLink = () => {
        if (plaidErrorMessage) {
            return <Text style={[styles.formError, styles.mh5]}>{plaidErrorMessage}</Text>;
        }
        if (!plaidLinkToken || plaidData?.isLoading) {
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
                onPress={() => openPlaidBankAccountSelector(MOCK_PUBLIC_TOKEN)}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SELECT_SETUP_OPTION}
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
                onSubmit={() => onNext({plaidAccountID: selectedPlaidAccountID})}
                submitButtonText={translate('common.next')}
                style={styles.flexGrow1}
                submitButtonStyles={styles.mh5}
                isSubmitDisabled={!selectedPlaidAccountID}
                isLoading={!!account?.isLoading}
                shouldHideFixErrorsAlert
            >
                <Text style={[styles.mh5, styles.mb3, styles.textHeadlineLineHeightXXL]}>{translate('bankAccount.chooseAnAccount')}</Text>
                <Text style={[styles.mh5, styles.mb6, styles.textSupporting]}>{translate('bankAccount.plaidBodyCopy')}</Text>
                <RadioButtons
                    items={plaidBankAccounts.map((bankAccount) => ({value: bankAccount.plaidAccountID, label: `${bankAccount.bankName} ${bankAccount.mask}`}))}
                    defaultCheckedValue={selectedPlaidAccountID}
                    onSelect={(plaidAccountID) => updateOnboardingDraft({plaidAccountID})}
                />
                <FormHelpMessage
                    style={styles.mh5}
                    message={getLatestErrorMessage(account)}
                />
            </FormProvider>
        </FullPageOfflineBlockingView>
    );
}

export default Plaid;
