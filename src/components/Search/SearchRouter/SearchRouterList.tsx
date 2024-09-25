import React, {useCallback} from 'react';
import * as Expensicons from '@components/Icon/Expensicons';
import type {SearchQueryJSON} from '@components/Search/types';
import SelectionList from '@components/SelectionList';
import SingleIconListItem from '@components/SelectionList/Search/SingleIconListItem';
import type {SingleIconListItemProps} from '@components/SelectionList/Search/SingleIconListItem';
import type {SectionListDataType, SingleIconListItemType, UserListItemProps, UserListItemType} from '@components/SelectionList/types';
import UserListItem from '@components/SelectionList/UserListItem';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {OptionData} from '@libs/ReportUtils';
import * as SearchUtils from '@libs/SearchUtils';
import * as Report from '@userActions/Report';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

type ItemWithQuery = {
    query: string;
};

type SearchRouterListProps = {
    currentQuery: SearchQueryJSON | undefined;
    reportForContextualSearch?: OptionData;
    recentSearches: ItemWithQuery[] | undefined;
    recentReports: OptionData[];
    onSearchSubmit: (query: SearchQueryJSON | undefined) => void;
    updateUserSearchQuery: (newSearchQuery: string) => void;
    closeAndClearRouter: () => void;
};

function SearchRouterItem(props: UserListItemProps<UserListItemType> | SingleIconListItemProps<SingleIconListItemType>) {
    const styles = useThemeStyles();
    // Here instead of checking itemType prepare correct type guards for the prop types and use them
    if (props.item) {
        // this cast would actually happen in the type guard; type guard can stay in this file I think
        const actuallyProps = props as UserListItemProps<UserListItemType>;
        return (
            <UserListItem
                pressableStyle={styles.br2}
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...actuallyProps}
            />
        );
    }
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <SingleIconListItem {...props} />;
}

function SearchRouterList({currentQuery, reportForContextualSearch, recentSearches, recentReports, onSearchSubmit, updateUserSearchQuery, closeAndClearRouter}: SearchRouterListProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const sections: Array<SectionListDataType<SingleIconListItemType | UserListItemType>> = [];

    if (currentQuery?.inputQuery) {
        sections.push({
            data: [
                {
                    text: currentQuery?.inputQuery,
                    singleIcon: Expensicons.MagnifyingGlass,
                    query: currentQuery?.inputQuery,
                    itemStyle: styles.activeComponentBG,
                    keyForList: 'findItem',
                    itemType: CONST.SEARCH.ROUTER_LIST_ITEM_TYPE.SEARCH,
                },
            ],
        });
    }

    if (reportForContextualSearch) {
        sections.push({
            data: [
                {
                    text: `${translate('search.searchIn')}${reportForContextualSearch.text ?? reportForContextualSearch.alternateText}`,
                    singleIcon: Expensicons.MagnifyingGlass,
                    query: `in:${reportForContextualSearch.reportID}`,
                    itemStyle: styles.activeComponentBG,
                    keyForList: 'contextualSearch',
                    itemType: CONST.SEARCH.ROUTER_LIST_ITEM_TYPE.CONTEXTUAL_SUGGESTION,
                },
            ],
        });
    }

    const recentSearchesData = recentSearches?.map(({query}) => ({
        text: query,
        singleIcon: Expensicons.History,
        query,
        keyForList: query,
        itemType: CONST.SEARCH.ROUTER_LIST_ITEM_TYPE.SEARCH,
    }));

    if (recentSearchesData && recentSearchesData.length > 0) {
        sections.push({title: translate('search.recentSearches'), data: recentSearchesData});
    }

    const recentReportsData = recentReports.map((item) => ({...item, pressableStyle: styles.br2, itemType: CONST.SEARCH.ROUTER_LIST_ITEM_TYPE.REPORT}));
    sections.push({title: translate('search.recentChats'), data: recentReportsData});

    const onSelectRow = useCallback(
        (item: SingleIconListItemType | UserListItemType) => {
            // eslint-disable-next-line default-case
            // Here instead of switch on itemType prepare correct type guards for the types of list item: SingleIconListItemType and UserListItemType and use them here
            switch (item.itemType) {
                case CONST.SEARCH.ROUTER_LIST_ITEM_TYPE.SEARCH:
                    // Handle selection of "Recent search"
                    if (!('query' in item) || !item?.query) {
                        return;
                    }
                    onSearchSubmit(SearchUtils.buildSearchQueryJSON(item?.query));
                    return;
                case CONST.SEARCH.ROUTER_LIST_ITEM_TYPE.CONTEXTUAL_SUGGESTION:
                    // Handle selection of "Contextual search suggestion"
                    if (!('query' in item) || !item?.query || currentQuery?.inputQuery.includes(item?.query)) {
                        return;
                    }
                    updateUserSearchQuery(`${item?.query} ${currentQuery?.inputQuery ?? ''}`);
                    return;
                case CONST.SEARCH.ROUTER_LIST_ITEM_TYPE.REPORT:
                    // Handle selection of "Recent chat"
                    closeAndClearRouter();
                    if ('reportID' in item && item?.reportID) {
                        Navigation.closeAndNavigate(ROUTES.REPORT_WITH_ID.getRoute(item?.reportID));
                    } else if ('login' in item) {
                        Report.navigateToAndOpenReport(item?.login ? [item.login] : []);
                    }
            }
        },
        [closeAndClearRouter, onSearchSubmit, currentQuery, updateUserSearchQuery],
    );

    return (
        <SelectionList<SingleIconListItemType | UserListItemType>
            sections={sections}
            onSelectRow={onSelectRow}
            ListItem={SearchRouterItem}
            containerStyle={styles.mh100}
        />
    );
}

export default SearchRouterList;
export {SearchRouterItem};
export type {ItemWithQuery};
