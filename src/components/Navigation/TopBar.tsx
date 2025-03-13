import React from 'react';
import {View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import LoadingBar from '@components/LoadingBar';
import {PressableWithoutFeedback} from '@components/Pressable';
import SearchButton from '@components/Search/SearchRouter/SearchButton';
import HelpButton from '@components/SidePane/HelpButton';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import SignInButton from '@pages/home/sidebar/SignInButton';
import {isAnonymousUser as isAnonymousUserUtil} from '@userActions/Session';
import ONYXKEYS from '@src/ONYXKEYS';

type TopBarProps = {
    breadcrumbLabel: string;
    shouldDisplaySearch?: boolean;
    shouldDisplaySidePane?: boolean;
    cancelSearch?: () => void;
};

function TopBar({breadcrumbLabel, shouldDisplaySearch = true, shouldDisplaySidePane = true, cancelSearch}: TopBarProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [session] = useOnyx(ONYXKEYS.SESSION, {selector: (sessionValue) => sessionValue && {authTokenType: sessionValue.authTokenType}});
    const [isLoadingReportData] = useOnyx(ONYXKEYS.IS_LOADING_REPORT_DATA);
    const isAnonymousUser = isAnonymousUserUtil(session);

    const displaySignIn = isAnonymousUser;
    const displaySearch = !isAnonymousUser && shouldDisplaySearch;

    return (
        <View style={[styles.w100, styles.zIndex10]}>
            <View
                style={[styles.flexRow, styles.mh5, styles.alignItemsCenter, styles.justifyContentBetween, {height: 80}]}
                dataSet={{dragArea: true}}
            >
                <View style={[styles.flex1, styles.flexRow, styles.alignItemsCenter]}>
                    <Text
                        numberOfLines={1}
                        style={[styles.flexShrink1, styles.topBarLabel]}
                    >
                        {breadcrumbLabel}
                    </Text>
                </View>
                {displaySignIn && <SignInButton />}
                {!!cancelSearch && (
                    <PressableWithoutFeedback
                        accessibilityLabel={translate('common.cancel')}
                        style={[styles.textBlue]}
                        onPress={() => {
                            cancelSearch();
                        }}
                    >
                        <Text style={[styles.textBlue]}>{translate('common.cancel')}</Text>
                    </PressableWithoutFeedback>
                )}
                {shouldDisplaySidePane && <HelpButton />}
                {displaySearch && <SearchButton />}
            </View>
            <LoadingBar shouldShow={isLoadingReportData ?? false} />
        </View>
    );
}

TopBar.displayName = 'TopBar';

export default TopBar;
