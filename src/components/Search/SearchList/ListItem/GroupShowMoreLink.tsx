import LinkButton from '@components/Button/composed/LinkButton';
import {getShowMoreFocusKey} from '@components/Search/SearchList/groupedFocusStops';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';

import useSearchListFocusTarget from './useSearchListFocusTarget';

type GroupShowMoreLinkProps = {
    /** The key of the open group the link loads more expenses for */
    groupKey: string;

    onPress: () => void;
};

/** The "Show more" link below an open group's expenses, which the Search list's arrow keys stop on after the last expense */
function GroupShowMoreLink({groupKey, onPress}: GroupShowMoreLinkProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {ref, onFocus} = useSearchListFocusTarget({keyForList: getShowMoreFocusKey(groupKey), activate: onPress});

    return (
        <LinkButton
            ref={ref}
            onFocus={onFocus}
            sentryLabel={CONST.SENTRY_LABEL.SEARCH.GROUP_SHOW_MORE_BUTTON}
            onPress={onPress}
            isNested
            size={CONST.BUTTON_SIZE.MEDIUM}
            innerStyles={[styles.ph2]}
        >
            <LinkButton.Text style={[styles.fontSizeNormal]}>{translate('common.showMore')}</LinkButton.Text>
        </LinkButton>
    );
}

export default GroupShowMoreLink;
