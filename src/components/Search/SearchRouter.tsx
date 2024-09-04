import React, {useState} from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import * as Expensicons from '@components/Icon/Expensicons';
import Modal from '@components/Modal';
import SelectionList from '@components/SelectionList';
import TableListItem from '@components/SelectionList/TableListItem';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import * as SearchUtils from '@libs/SearchUtils';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {SearchDataTypes} from '@src/types/onyx/SearchResults';
import SearchRouterInput from './SearchRouter/SearchRouterInput';
import type {SearchQueryJSON} from './types';

type SearchRouterProps = {
    type?: SearchDataTypes;
};

function SearchRouter({type}: SearchRouterProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {isSmallScreenWidth} = useResponsiveLayout();

    const [isDisplayed, setIsDisplayed] = useState(false);
    const [currentQuery, setCurrentQuery] = useState<SearchQueryJSON | undefined>(undefined);

    const modalType = isSmallScreenWidth ? CONST.MODAL.MODAL_TYPE.CENTERED_UNSWIPEABLE : CONST.MODAL.MODAL_TYPE.POPOVER;
    const fullscreen = true;

    const onSearch = (userQuery: string) => {
        if (userQuery.length < 3) {
            return;
        }

        const query = type ? `type:${type} ${userQuery}` : userQuery;
        const queryJSON = SearchUtils.buildSearchQueryJSON(query);

        if (queryJSON) {
            setCurrentQuery(queryJSON);
        }
    };

    const sectionData = currentQuery
        ? [
              {
                  text: `Search for: ${currentQuery.inputQuery}`,
              },
          ]
        : [];

    return (
        <>
            <Button
                text={translate('common.search')}
                icon={Expensicons.MagnifyingGlass}
                onPress={() => {
                    setIsDisplayed(true);
                }}
                medium
            />
            <Modal
                type={modalType}
                fullscreen={fullscreen}
                isVisible={isDisplayed}
                popoverAnchorPosition={{right: 20, top: 20}}
                onClose={() => {
                    setIsDisplayed(false);
                }}
            >
                <View style={[styles.flex1, styles.p4, styles.m5]}>
                    <SearchRouterInput onSearch={onSearch} />
                    {currentQuery ? (
                        <View>
                            <SelectionList
                                sections={[{data: sectionData}]}
                                ListItem={TableListItem}
                                onSelectRow={() => {
                                    // Todo different items will have different functionalities on click
                                    const query = SearchUtils.buildSearchQueryString(currentQuery);

                                    setIsDisplayed(false);
                                    Navigation.navigate(ROUTES.SEARCH_CENTRAL_PANE.getRoute({query}));
                                }}
                            />
                        </View>
                    ) : null}
                </View>
            </Modal>
        </>
    );
}

SearchRouter.displayName = 'SearchRouter';

export default SearchRouter;
