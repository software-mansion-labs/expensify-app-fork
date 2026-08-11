/**
 * ListItem – composed building blocks for SelectionList row content.
 *
 * Instead of copy-pasting avatar, title, subtitle, and caret recipes across variants,
 * sub-components are composed as children:
 *
 * @example
 * ```tsx
 * import ListItem from '@components/SelectionList/ListItemComposed';
 *
 * <ListItem.TextColumn>
 *   <ListItem.Title text={name} showTooltip />
 *   <ListItem.Subtitle text={subtitle} showTooltip />
 * </ListItem.TextColumn>
 * ```
 *
 * Existing list item variants (UserListItem, BaseListItem, …) are not affected – migration can be gradual.
 *
 * Note: the Onyx data type is also named `ListItem`. In variant files that use both, import this module as
 * `ListItemComposed` to avoid the name collision (see UserListItemContent).
 */
import type React from 'react';

import ListItemPressable from './ListItemPressable';
import ListItemCompactAvatar from './primitives/ListItemCompactAvatar';
import ListItemRBRIndicator from './primitives/ListItemRBRIndicator';
import ListItemReportAvatar from './primitives/ListItemReportAvatar';
import ListItemRightCaret from './primitives/ListItemRightCaret';
import ListItemRow from './primitives/ListItemRow';
import ListItemSubtitle from './primitives/ListItemSubtitle';
import ListItemTextColumn from './primitives/ListItemTextColumn';
import ListItemTitle from './primitives/ListItemTitle';
import ListItemUserAvatar from './primitives/ListItemUserAvatar';
import ListItemWorkspaceAvatar from './primitives/ListItemWorkspaceAvatar';

function ListItemRoot({children}: {children?: React.ReactNode}) {
    return children ?? null;
}

const ListItem = Object.assign(ListItemRoot, {
    Pressable: ListItemPressable,
    Row: ListItemRow,
    Title: ListItemTitle,
    Subtitle: ListItemSubtitle,
    TextColumn: ListItemTextColumn,
    ReportAvatar: ListItemReportAvatar,
    UserAvatar: ListItemUserAvatar,
    WorkspaceAvatar: ListItemWorkspaceAvatar,
    CompactAvatar: ListItemCompactAvatar,
    RBRIndicator: ListItemRBRIndicator,
    RightCaret: ListItemRightCaret,
});

export default ListItem;
export {default as useListItemHighlight} from './hooks/useListItemHighlight';
