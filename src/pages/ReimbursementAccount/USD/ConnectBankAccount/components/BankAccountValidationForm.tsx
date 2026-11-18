import DynamicFormFlow from '@components/DynamicForm';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {validateBankAccount} from '@libs/actions/BankAccounts';
import {getBankAccountIDAsNumber} from '@libs/ReimbursementAccountUtils';

import getBankAccountValidationForm, {getBankAccountValidationErrors, getValidateCode} from '@pages/ReimbursementAccount/USD/ConnectBankAccount/getBankAccountValidationForm';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {Route} from '@src/ROUTES';
import type {Policy, ReimbursementAccount} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';
import {View} from 'react-native';

import Enable2FACard from './Enable2FACard';

type BankAccountValidationFormProps = {
    /** Bank account currently in setup */
    reimbursementAccount?: ReimbursementAccount;

    /** Boolean required to display Enable2FACard component */
    requiresTwoFactorAuth: boolean;

    /** The workspace whose output currency the amounts are in */
    policy: OnyxEntry<Policy>;

    /** The workspace in the route, carried into the route of the form's page */
    policyID?: string;

    /** Route to return to when navigating back out of the flow */
    backTo?: Route;

    onBackButtonPress: () => void;
};

/** The validation of a pending bank account, where the user enters the amounts of the three test transactions sent to it */
function BankAccountValidationForm({requiresTwoFactorAuth, reimbursementAccount, policy, policyID, backTo, onBackButtonPress}: BankAccountValidationFormProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const achData = reimbursementAccount?.achData;
    const bankAccountID = getBankAccountIDAsNumber(achData);
    const title = translate('connectBankAccountStep.validateYourBankAccount');

    return (
        <DynamicFormFlow
            schema={getBankAccountValidationForm(translate)}
            formID={ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM}
            testID="ConnectBankAccount"
            headerTitle={title}
            // The step has no confirmation page, so this title only shows if the schema ever loses its page
            confirmationTitle={title}
            hasConfirmation={false}
            submitButtonText={translate('connectBankAccountStep.validateButtonText')}
            currency={policy?.outputCurrency ?? CONST.CURRENCY.USD}
            buildRoute={(pageName, action) => ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID, page: CONST.BANK_ACCOUNT.PAGE_NAMES.VALIDATION, subPage: pageName, action, backTo})}
            onBack={onBackButtonPress}
            validatePage={(page, values) => getBankAccountValidationErrors(values, translate)}
            onSubmit={(answers) => {
                if (!bankAccountID) {
                    return;
                }
                validateBankAccount(bankAccountID, getValidateCode(answers), achData?.policyID);
            }}
        >
            {!requiresTwoFactorAuth && (
                <View style={[styles.mln5, styles.mrn5, styles.mt3]}>
                    <Enable2FACard />
                </View>
            )}
        </DynamicFormFlow>
    );
}

export default BankAccountValidationForm;
