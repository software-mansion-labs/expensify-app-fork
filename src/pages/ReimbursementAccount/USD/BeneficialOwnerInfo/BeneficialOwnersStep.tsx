import DynamicFormFlow from '@components/DynamicForm';
import useDraftPrefill from '@components/DynamicForm/hooks/useDraftPrefill';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import RenderHTML from '@components/RenderHTML';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import {getBankAccountIDAsNumber} from '@libs/ReimbursementAccountUtils';

import type USDPageProps from '@pages/ReimbursementAccount/USD/types';

import {updateBeneficialOwnersForBankAccount} from '@userActions/BankAccounts';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import React from 'react';
import {View} from 'react-native';

import getBeneficialOwnersForm, {getBeneficialOwnersParams, getBeneficialOwnersPrefill} from './beneficialOwnersForm';

const FORM_ID = ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM;

/** Where this step sits among `CONST.BANK_ACCOUNT.STEP_NAMES` */
const STEP_INDEX = 5;

/** The "Beneficial owners" step of the USD bank account setup. The answers are drafted as the user goes, and Confirm saves the whole step. */
function BeneficialOwnersStep({onBackButtonPress, onSubmit, backTo}: USDPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);

    const achData = reimbursementAccount?.achData;
    const policyID = achData?.policyID;
    const markSubmitting = useReimbursementAccountSubmitCallback(onSubmit);
    const isPrefillPending = useDraftPrefill(FORM_ID, getBeneficialOwnersPrefill(achData));

    if (isPrefillPending) {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }

    return (
        <DynamicFormFlow
            schema={getBeneficialOwnersForm(translate, achData?.companyName ?? '', !!draft?.ownsMoreThan25Percent)}
            formID={FORM_ID}
            testID="BeneficialOwnersStep"
            headerTitle={translate('beneficialOwnerInfoStep.companyOwner')}
            confirmationTitle={translate('beneficialOwnerInfoStep.letsDoubleCheck')}
            confirmationSubtitle={translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity')}
            parentSteps={{names: CONST.BANK_ACCOUNT.STEP_NAMES, index: STEP_INDEX}}
            buildRoute={(pageName, action) => ROUTES.BANK_ACCOUNT_USD_SETUP.getRoute({policyID, page: CONST.BANK_ACCOUNT.PAGE_NAMES.BENEFICIAL_OWNERS, subPage: pageName, action, backTo})}
            onBack={onBackButtonPress}
            onSubmit={(answers) => {
                updateBeneficialOwnersForBankAccount(getBankAccountIDAsNumber(achData), getBeneficialOwnersParams(answers), policyID);
                markSubmitting();
            }}
            isSubmitting={!!reimbursementAccount?.isLoading}
            submitError={getLatestErrorMessage(reimbursementAccount ?? {})}
        >
            <View style={styles.renderHTML}>
                <RenderHTML html={translate('onfidoStep.onfidoLinks', `${translate('beneficialOwnerInfoStep.byAddingThisBankAccount')} `)} />
            </View>
        </DynamicFormFlow>
    );
}

export default BeneficialOwnersStep;
