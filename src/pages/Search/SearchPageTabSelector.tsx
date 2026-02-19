import React, {useEffect} from 'react';
import type {SearchQueryJSON} from '@components/Search/types';
import type {TabSelectorBaseItem} from '@components/TabSelector/types';
import ScrollableTabSelectorBase from '@components/TabSelector/ScrollableTabSelector/ScrollableTabSelectorBase';
import ScrollableTabSelectorContextProvider from '@components/TabSelector/ScrollableTabSelector/ScrollableTabSelectorContext';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSearchTypeMenuSections from '@hooks/useSearchTypeMenuSections';
import {setSearchContext} from '@libs/actions/Search';
import Navigation from '@libs/Navigation/Navigation';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

type SearchPageTabSelectorProps = {
    queryJSON?: SearchQueryJSON;
};

function SearchPageTabSelector({queryJSON}: SearchPageTabSelectorProps) {
    const {translate} = useLocalize();
    const {typeMenuSections} = useSearchTypeMenuSections();
    const [savedSearches] = useOnyx(ONYXKEYS.SAVED_SEARCHES, {canBeMissing: true});
    const expensifyIcons = useMemoizedLazyExpensifyIcons([
        'Receipt',
        'ChatBubbles',
        'MoneyBag',
        'CreditCard',
        'MoneyHourglass',
        'CreditCardHourglass',
        'Bank',
        'User',
        'Folder',
        'Basket',
        'CalendarSolid',
        'Bookmark',
    ] as const);

    const flattenedItems = typeMenuSections.flatMap((section) => section.menuItems);
    const queryMap = new Map<string, {query: string; name?: string}>();
    const tabItems: TabSelectorBaseItem[] = [];
    let activeKey = '';

    for (const item of flattenedItems) {
        const icon = typeof item.icon === 'string' ? expensifyIcons[item.icon] : item.icon;
        tabItems.push({
            key: item.key,
            icon,
            title: translate(item.translationPath),
        });
        queryMap.set(item.key, {query: item.searchQuery});
        if (queryJSON && item.similarSearchHash === queryJSON.similarSearchHash) {
            activeKey = item.key;
        }
    }

    if (savedSearches) {
        for (const [key, item] of Object.entries(savedSearches)) {
            const tabKey = `saved_${key}`;
            tabItems.push({
                key: tabKey,
                icon: expensifyIcons.Bookmark,
                title: item.name ?? item.query ?? '',
            });
            queryMap.set(tabKey, {query: item.query ?? '', name: item.name});
            if (queryJSON && Number(key) === queryJSON.hash) {
                activeKey = tabKey;
            }
        }
    }

    const handleTabPress = (tabKey: string) => {
        const searchData = queryMap.get(tabKey);
        if (!searchData) {
            return;
        }
        setSearchContext(false);
        Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query: searchData.query, name: searchData.name}));
    };

    useEffect(() => {
        console.log('MOUNT');
        return () => {
            console.log('UNMOUNT');
        };
    }, []);

    return (
        <ScrollableTabSelectorContextProvider activeTabKey={activeKey}>
            <ScrollableTabSelectorBase
                tabs={tabItems}
                activeTabKey={activeKey}
                onTabPress={handleTabPress}
            />
        </ScrollableTabSelectorContextProvider>
    );
}

export default SearchPageTabSelector;
