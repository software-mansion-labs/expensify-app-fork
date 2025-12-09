import React from 'react';
import {View} from 'react-native';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {Plus} from '@components/Icon/Expensicons';
import ScreenWrapper from '@components/ScreenWrapper';
import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {DomainSplitNavigatorParamList} from '@navigation/types';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import DomainSamlPage from './DomainSamlPage';
import ScrollViewWithContext from '@components/ScrollViewWithContext';
import SelectionList from '@components/SelectionList';
import TableListItem from '@components/SelectionListWithSections/TableListItem';

type DomainSamlPageProps = PlatformStackScreenProps<DomainSplitNavigatorParamList, typeof SCREENS.DOMAIN.SAML>;

function DomainAdminsPage({route}: DomainSamlPageProps) {
    const domainID = route.params.accountID;
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['LaptopOnDeskWithCoffeeAndKey', 'LockClosed', 'OpenSafe', 'ShieldYellow', 'Members'] as const);

    const [domain] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {canBeMissing: true});
    const [isAdmin] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_ADMIN_ACCESS}${domainID}`, {canBeMissing: false});

    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const getHeaderButtons = () => {
        if (!isAdmin) {
            return null;
        }
        return (
            <View style={[styles.flexRow, styles.gap2]}>
                <Button
                    success
                    onPress={() => {}}
                    text={translate('domain.admins.addAdmin')}
                    icon={Plus}
                    innerStyles={[shouldUseNarrowLayout && styles.alignItemsCenter]}
                    style={[shouldUseNarrowLayout && styles.flexGrow1, shouldUseNarrowLayout && styles.mb3]}
                />
            </View>
        );
    };

    return (
        <ScreenWrapper
            enableEdgeToEdgeBottomSafeAreaPadding
            shouldEnableMaxHeight
            shouldShowOfflineIndicatorInWideScreen
            testID={DomainSamlPage.displayName}
        >
            <FullPageNotFoundView
                onBackButtonPress={() => Navigation.goBack(ROUTES.WORKSPACES_LIST.route)}
                shouldShow={!domain || !isAdmin}
                shouldForceFullScreen
                shouldDisplaySearchRouter
            >
                <HeaderWithBackButton
                    title={translate('domain.admins.title')}
                    onBackButtonPress={Navigation.popToSidebar}
                    icon={illustrations.Members}
                    shouldShowBackButton={shouldUseNarrowLayout}
                >
                    {getHeaderButtons()}
                </HeaderWithBackButton>

                <ScrollViewWithContext
                    keyboardShouldPersistTaps="handled"
                    addBottomSafeAreaPadding
                    style={[styles.settingsPageBackground, styles.flex1, styles.w100]}
                >
                    <View style={shouldUseNarrowLayout ? styles.workspaceSectionMobile : styles.workspaceSection}>
                        <SelectionList
                            data={[]}
                            ListItem={TableListItem}
                            onSelectRow={() => {}}
                        />
                    </View>
                </ScrollViewWithContext>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

export default DomainAdminsPage;
