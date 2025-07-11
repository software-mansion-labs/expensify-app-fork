import React from 'react';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import TextInput from '@components/TextInput';
import useAutoFocusInput from '@hooks/useAutoFocusInput';
import useCardFeeds from '@hooks/useCardFeeds';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import useWorkspaceAccountID from '@hooks/useWorkspaceAccountID';
import {getCompanyFeeds, getCustomCardName, getDomainOrWorkspaceAccountID} from '@libs/CardUtils';
import {addErrorMessage} from '@libs/ErrorUtils';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import {getFieldRequiredErrors} from '@libs/ValidationUtils';
import Navigation from '@navigation/Navigation';
import type {SettingsNavigatorParamList} from '@navigation/types';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import {updateCompanyCardName} from '@userActions/CompanyCards';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/EditExpensifyCardNameForm';
import type {CompanyCardFeed} from '@src/types/onyx';

type WorkspaceCompanyCardEditCardNamePageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.COMPANY_CARD_NAME>;

function WorkspaceCompanyCardEditCardNamePage({route}: WorkspaceCompanyCardEditCardNamePageProps) {
    const {policyID, cardID} = route.params;
    const workspaceAccountID = useWorkspaceAccountID(policyID);
    const bank = decodeURIComponent(route.params.bank);
    const [customCardNames] = useOnyx(ONYXKEYS.NVP_EXPENSIFY_COMPANY_CARDS_CUSTOM_NAMES, {canBeMissing: true});
    const defaultValue = customCardNames?.[cardID] ?? getCustomCardName(cardID);

    const {translate} = useLocalize();
    const {inputCallbackRef} = useAutoFocusInput();
    const styles = useThemeStyles();

    const [cardFeeds] = useCardFeeds(policyID);
    const companyFeeds = getCompanyFeeds(cardFeeds);
    const domainOrWorkspaceAccountID = getDomainOrWorkspaceAccountID(workspaceAccountID, companyFeeds[bank as CompanyCardFeed]);

    const submit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.EDIT_WORKSPACE_COMPANY_CARD_NAME_FORM>) => {
        updateCompanyCardName(domainOrWorkspaceAccountID, cardID, values[INPUT_IDS.NAME], bank, defaultValue);
        Navigation.goBack(ROUTES.WORKSPACE_COMPANY_CARD_DETAILS.getRoute(policyID, cardID, bank), {compareParams: false});
    };

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.EDIT_WORKSPACE_COMPANY_CARD_NAME_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.EDIT_WORKSPACE_COMPANY_CARD_NAME_FORM> => {
        const errors = getFieldRequiredErrors(values, [INPUT_IDS.NAME]);
        const length = values.name.length;
        if (length > CONST.STANDARD_LENGTH_LIMIT) {
            addErrorMessage(
                errors,
                INPUT_IDS.NAME,
                translate('common.error.characterLimitExceedCounter', {
                    length,
                    limit: CONST.STANDARD_LENGTH_LIMIT,
                }),
            );
        }
        return errors;
    };

    return (
        <AccessOrNotFoundWrapper
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_COMPANY_CARDS_ENABLED}
        >
            <ScreenWrapper
                testID={WorkspaceCompanyCardEditCardNamePage.displayName}
                shouldEnablePickerAvoiding={false}
                shouldEnableMaxHeight
            >
                <HeaderWithBackButton
                    title={translate('workspace.moreFeatures.companyCards.cardName')}
                    onBackButtonPress={() => Navigation.goBack(ROUTES.WORKSPACE_COMPANY_CARD_DETAILS.getRoute(policyID, cardID, bank), {compareParams: false})}
                />
                <Text style={[styles.mh5, styles.mt3, styles.mb5]}>{translate('workspace.moreFeatures.companyCards.giveItNameInstruction')}</Text>
                <FormProvider
                    formID={ONYXKEYS.FORMS.EDIT_WORKSPACE_COMPANY_CARD_NAME_FORM}
                    submitButtonText={translate('common.save')}
                    onSubmit={submit}
                    style={[styles.flex1, styles.mh5]}
                    enabledWhenOffline
                    validate={validate}
                    shouldHideFixErrorsAlert
                >
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.NAME}
                        label={translate('workspace.moreFeatures.companyCards.cardName')}
                        aria-label={translate('workspace.moreFeatures.companyCards.cardName')}
                        role={CONST.ROLE.PRESENTATION}
                        defaultValue={defaultValue}
                        ref={inputCallbackRef}
                    />
                </FormProvider>
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

WorkspaceCompanyCardEditCardNamePage.displayName = 'WorkspaceCompanyCardEditCardNamePage';

export default WorkspaceCompanyCardEditCardNamePage;
