import ListItemComposed from '@components/SelectionList/ListItemComposed';

import React from 'react';

import type {BaseListItemProps, ListItem, ListItemRenderContext} from './types';

function renderListItemChildren<TItem extends ListItem>(children: BaseListItemProps<TItem>['children'], hovered: boolean, renderContext: ListItemRenderContext) {
    if (typeof children === 'function') {
        return children(hovered, renderContext);
    }

    return children;
}

/**
 * The foundational pressable row that all list items build on. A thin adapter over
 * ListItemComposed.Pressable that reproduces the legacy fixed layout: a wrapper row
 * (wrapperStyle/testID) containing children + RBR indicator + right-hand-side slot + right caret,
 * followed by FooterComponent. Composed rows can use ListItemComposed.Pressable directly and own
 * the layout instead. Use SelectableListItem when a selection button (checkbox or radio) is needed.
 */
function BaseListItem<TItem extends ListItem>({
    item,
    wrapperStyle,
    rightHandSideComponent,
    FooterComponent,
    children,
    isFocused,
    shouldDisplayRBR = true,
    shouldShowRightCaret = false,
    isDisabled = false,
    forwardedFSClass,
    testID,
    ...pressableProps
}: BaseListItemProps<TItem>) {
    const rightHandSideComponentRender = () => {
        if (!rightHandSideComponent) {
            return null;
        }

        if (typeof rightHandSideComponent === 'function') {
            return rightHandSideComponent(item, isFocused);
        }

        return rightHandSideComponent;
    };

    return (
        <ListItemComposed.Pressable
            {...pressableProps}
            item={item}
            isFocused={isFocused}
            isDisabled={isDisabled}
        >
            {(hovered, renderContext) => (
                <>
                    <ListItemComposed.Row
                        testID={testID}
                        style={wrapperStyle}
                        forwardedFSClass={forwardedFSClass}
                    >
                        {renderListItemChildren(children, hovered, renderContext)}

                        {shouldDisplayRBR && (
                            <ListItemComposed.RBRIndicator
                                brickRoadIndicator={item.brickRoadIndicator}
                                isSelected={renderContext.isSelected}
                                canShowSeveralIndicators={item.canShowSeveralIndicators}
                            />
                        )}

                        {rightHandSideComponentRender()}

                        {shouldShowRightCaret && (
                            <ListItemComposed.RightCaret
                                isDisabled={!!isDisabled}
                                isInteractive={item.isInteractive !== false}
                                variant="base"
                            />
                        )}
                    </ListItemComposed.Row>
                    {FooterComponent}
                </>
            )}
        </ListItemComposed.Pressable>
    );
}

export default BaseListItem;
