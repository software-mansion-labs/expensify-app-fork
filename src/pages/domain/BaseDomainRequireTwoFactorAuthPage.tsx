import React, {useRef} from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import FixedFooter from '@components/FixedFooter';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import TwoFactorAuthForm from '@components/TwoFactorAuthForm';
import type {BaseTwoFactorAuthFormRef} from '@components/TwoFactorAuthForm/types';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import DomainNotFoundPageWrapper from '@pages/domain/DomainNotFoundPageWrapper';
import ONYXKEYS from '@src/ONYXKEYS';

type BaseDomainRequireTwoFactorAuthPageProps = {
    domainAccountID: number;
    onSubmit: (code: string) => void;
    onBackButtonPress: () => void;
};

function BaseDomainRequireTwoFactorAuthPage({domainAccountID, onSubmit, onBackButtonPress}: BaseDomainRequireTwoFactorAuthPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const [account] = useOnyx(ONYXKEYS.ACCOUNT, {canBeMissing: true});

    const baseTwoFactorAuthRef = useRef<BaseTwoFactorAuthFormRef>(null);

    return (
        <DomainNotFoundPageWrapper domainAccountID={domainAccountID}>
            <ScreenWrapper
                shouldEnableMaxHeight
                shouldUseCachedViewportHeight
                testID={BaseDomainRequireTwoFactorAuthPage.displayName}
                enableEdgeToEdgeBottomSafeAreaPadding
            >
                <HeaderWithBackButton
                    title={translate('twoFactorAuth.disableTwoFactorAuth')}
                    onBackButtonPress={onBackButtonPress}
                />

                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.flexGrow1}
                >
                    <View style={[styles.mh5]}>
                        <TwoFactorAuthForm
                            ref={baseTwoFactorAuthRef}
                            shouldAllowRecoveryCode
                            onSubmit={onSubmit}
                            shouldAutoFocus={false}
                        />
                    </View>
                </ScrollView>
                <FixedFooter style={[styles.mt2, styles.pt2]}>
                    <Button
                        success
                        large
                        text={translate('common.disable')}
                        isLoading={account?.isLoading}
                        onPress={() => baseTwoFactorAuthRef.current?.validateAndSubmitForm()}
                    />
                </FixedFooter>
            </ScreenWrapper>
        </DomainNotFoundPageWrapper>
    );
}

BaseDomainRequireTwoFactorAuthPage.displayName = 'BaseDomainRequireTwoFactorAuthPage';

export default BaseDomainRequireTwoFactorAuthPage;
