import {useIsFocused} from '@react-navigation/native';
import {Str} from 'expensify-common';
import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import ConfirmModal from '@components/ConfirmModal';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Text from '@components/Text';
import TextInput from '@components/TextInput';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePrevious from '@hooks/usePrevious';
import useThemeStyles from '@hooks/useThemeStyles';
import {getLatestError} from '@libs/ErrorUtils';
import {goBackFromInvalidPolicy} from '@libs/PolicyUtils';
import {getFieldRequiredErrors} from '@libs/ValidationUtils';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import variables from '@styles/variables';
import {resetDomain} from '@userActions/Domain';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/ResetDomainForm';
import type DomainPendingActions from '@src/types/onyx/DomainPendingActions';

type DomainResetDomainPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.RESET_DOMAIN>;

function isPendingDeleteDomain(domainPendingActions?: DomainPendingActions) {
    return domainPendingActions?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;
}

function DomainResetDomainPage({route}: DomainResetDomainPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const [domain] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${route.params.domainAccountID}`, {canBeMissing: true});
    const domainName = domain ? Str.extractEmailDomain(domain.email) : '';
    const [domainPendingActions] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${route.params.domainAccountID}`, {
        canBeMissing: true,
    });
    const [domainErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${route.params.domainAccountID}`, {
        canBeMissing: true,
    });

    const [isConfirmModalVisible, setConfirmModalVisibility] = useState(false);
    const isFocused = useIsFocused();
    const isPendingDelete = isPendingDeleteDomain(domainPendingActions);
    const prevIsPendingDelete = usePrevious(isPendingDelete);
    const domainLastError = getLatestError(domainErrors?.removeDomainError);

    useEffect(() => {
        if (!isFocused || !prevIsPendingDelete || isPendingDelete) {
            return;
        }

        if (!domainLastError) {
            goBackFromInvalidPolicy();
            return;
        }
        setConfirmModalVisibility(true);
    }, [isFocused, isPendingDelete, prevIsPendingDelete, domainLastError]);

    const sanitizePhoneOrEmail = (phoneOrEmail: string): string => phoneOrEmail.replaceAll(/\s+/g, '').toLowerCase();

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.RESET_DOMAIN_FORM>) => {
        const errors = getFieldRequiredErrors(values, ['domainName']);

        if (values.domainName && domainName) {
            const isValid = sanitizePhoneOrEmail(domainName) === sanitizePhoneOrEmail(values.domainName);

            if (!isValid) {
                errors.domainName = translate('closeAccountPage.enterYourDefaultContactMethod');
            }
        }

        return errors;
    };

    return (
        <ScreenWrapper
            shouldEnableMaxHeight
            shouldUseCachedViewportHeight
            testID={DomainResetDomainPage.displayName}
            enableEdgeToEdgeBottomSafeAreaPadding
        >
            <HeaderWithBackButton
                title={translate('domain.admins.resetDomain')}
                onBackButtonPress={() => {
                    Navigation.goBack();
                }}
            />

            <FormProvider
                formID={ONYXKEYS.FORMS.RESET_DOMAIN_FORM}
                validate={validate}
                onSubmit={() => setConfirmModalVisibility(true)}
                submitButtonText={translate('domain.admins.resetDomain')}
                style={[styles.flexGrow1, styles.mh5]}
                isSubmitActionDangerous
            >
                <View
                    fsClass={CONST.FULLSTORY.CLASS.UNMASK}
                    style={[styles.flexGrow1]}
                >
                    <Text style={[styles.mt5]}>
                        {translate('domain.admins.resetDomainExplanation')} <Text style={[styles.textStrong]}>{domainName}</Text>
                    </Text>
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={INPUT_IDS.DOMAIN_NAME}
                        autoGrowHeight
                        maxAutoGrowHeight={variables.textInputAutoGrowMaxHeight}
                        label={translate('domain.admins.enterDomainName')}
                        aria-label={translate('domain.admins.enterDomainName')}
                        role={CONST.ROLE.PRESENTATION}
                        containerStyles={[styles.mt5]}
                        forwardedFSClass={CONST.FULLSTORY.CLASS.UNMASK}
                    />
                    <ConfirmModal
                        danger
                        title={translate('closeAccountPage.closeAccountWarning')}
                        onConfirm={() => {
                            resetDomain(route.params.domainAccountID);
                        }}
                        onCancel={() => {
                            setConfirmModalVisibility(false);
                        }}
                        isVisible={isConfirmModalVisible}
                        prompt={translate('closeAccountPage.closeAccountPermanentlyDeleteData')}
                        confirmText={translate('common.yesContinue')}
                        cancelText={translate('common.cancel')}
                        shouldDisableConfirmButtonWhenOffline
                        shouldShowCancelButton
                        isConfirmLoading={isPendingDeleteDomain(domainPendingActions)}
                    />
                </View>
            </FormProvider>
        </ScreenWrapper>
    );
}

DomainResetDomainPage.displayName = 'DomainResetDomainPage';

export default DomainResetDomainPage;
