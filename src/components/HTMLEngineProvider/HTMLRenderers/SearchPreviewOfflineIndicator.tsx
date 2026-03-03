import Icon from '@components/Icon';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import React from 'react';
import {View} from 'react-native';

function SearchPreviewOfflineIndicator() {
    const styles = useThemeStyles();
    const theme = useTheme();
    const icons = useMemoizedLazyExpensifyIcons(['OfflineCloud']);
    const {translate} = useLocalize();

    return (
        <View style={[styles.searchPreviewOfflineContainer, styles.searchPreviewContainer]}>
            <Icon
                fill={theme.border}
                src={icons.OfflineCloud}
                width={variables.searchPreviewOfflineIconSize}
                height={variables.searchPreviewOfflineIconSize}
            />

            <Text style={styles.searchPreviewOfflineDescription}>{translate('search.goOnlineToSeePreview')}</Text>
        </View>
    );
}

export default SearchPreviewOfflineIndicator;
