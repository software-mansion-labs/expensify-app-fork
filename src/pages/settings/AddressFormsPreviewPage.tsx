import DynamicFormFlow from '@components/DynamicForm';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItem from '@components/MenuItem';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';

import type {SubPageProps} from '@hooks/useSubPage/types';

import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import type {SettingsNavigatorParamList} from '@navigation/types';

import AdditionalDetailsStep from '@pages/EnablePayments/Pay/AdditionalDetails/AdditionalDetailsStep';
import WalletPersonalInfoAddress from '@pages/EnablePayments/Wallet/PersonalInfo/substeps/AddressStep';
import EnterSignerInfoAddress from '@pages/ReimbursementAccount/EnterSignerInfo/subSteps/Address';
import NonUSDBeneficialOwnerAddress from '@pages/ReimbursementAccount/NonUSD/BeneficialOwnerInfo/BeneficialOwnerDetailsFormSubSteps/Address';
import NonUSDBusinessAddress from '@pages/ReimbursementAccount/NonUSD/BusinessInfo/subSteps/Address';
import NonUSDSignerAddress from '@pages/ReimbursementAccount/NonUSD/SignerInfo/subSteps/Address';
import USDBeneficialOwnerAddress from '@pages/ReimbursementAccount/USD/BeneficialOwnerInfo/subSteps/BeneficialOwnerDetailsFormSubSteps/AddressUBO';
import USDBusinessAddress from '@pages/ReimbursementAccount/USD/BusinessInfo/subSteps/AddressBusiness';
import USDRequestorAddress from '@pages/ReimbursementAccount/USD/Requestor/PersonalInfo/subSteps/Address';
import US from '@pages/settings/Wallet/EnableGlobalReimbursements/Wise/forms/US';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

import type {ComponentType} from 'react';

import React from 'react';

type AddressFormsPreviewPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.SETTINGS.ADDRESS_FORMS_PREVIEW>;

const SUB_STEP_FORMS: Record<string, ComponentType<SubPageProps>> = {
    walletPersonalInfo: WalletPersonalInfoAddress,
    usdRequestor: USDRequestorAddress,
    usdBusiness: USDBusinessAddress,
    usdBeneficialOwner: (props) => (
        <USDBeneficialOwnerAddress
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            beneficialOwnerBeingModifiedID="preview"
        />
    ),
    nonUSDBusiness: NonUSDBusinessAddress,
    nonUSDBeneficialOwner: (props) => (
        <NonUSDBeneficialOwnerAddress
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            isUserEnteringHisOwnData={false}
            ownerBeingModifiedID="preview"
        />
    ),
    nonUSDSigner: NonUSDSignerAddress,
    enterSignerInfo: EnterSignerInfoAddress,
};

const FORM_NAMES = ['wise', 'additionalDetails', ...Object.keys(SUB_STEP_FORMS)];

const noop = () => {};

/** A temporary entry point that renders every form drawing AddressFormFields, so their spacing can be compared */
function AddressFormsPreviewPage({route}: AddressFormsPreviewPageProps) {
    const form = route.params?.form;

    if (form === 'wise') {
        return (
            <DynamicFormFlow
                schema={US}
                formID={ONYXKEYS.FORMS.WISE_BUSINESS_ONBOARDING_FORM}
                headerTitle="Wise"
                confirmationTitle="Wise"
                testID="AddressFormsPreviewWise"
                layout="pages"
                maxFileSize={CONST.API_ATTACHMENT_VALIDATIONS.MAX_SIZE}
                buildRoute={(pageName) => ROUTES.SETTINGS_ADDRESS_FORMS_PREVIEW.getRoute('wise', pageName)}
                shouldReplaceRoute
                onBack={() => Navigation.goBack()}
                isSubmitting={false}
                onSubmit={noop}
            />
        );
    }

    if (form === 'additionalDetails') {
        return <AdditionalDetailsStep />;
    }

    const SubStepForm = form ? SUB_STEP_FORMS[form] : undefined;
    if (SubStepForm) {
        return (
            <ScreenWrapper testID="AddressFormsPreviewSubStep">
                <HeaderWithBackButton title={form} />
                <SubStepForm
                    isEditing={false}
                    onNext={noop}
                    onMove={noop}
                />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper testID="AddressFormsPreviewList">
            <HeaderWithBackButton title="Address forms preview" />
            <ScrollView>
                {FORM_NAMES.map((name) => (
                    <MenuItem
                        key={name}
                        title={name}
                        shouldShowRightIcon
                        onPress={() => Navigation.navigate(ROUTES.SETTINGS_ADDRESS_FORMS_PREVIEW.getRoute(name))}
                    />
                ))}
            </ScrollView>
        </ScreenWrapper>
    );
}

export default AddressFormsPreviewPage;
