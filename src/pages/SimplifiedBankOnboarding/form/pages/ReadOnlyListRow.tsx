/**
 * A row of a list page that the user cannot open, like the row of the current user in the owner list
 */
import UserAvatar from '@components/Avatar/UserAvatar';
import MenuItem from '@components/MenuItem';

import CONST from '@src/CONST';

import React from 'react';

type ReadOnlyListRowProps = {
    title: string;
    description?: string;
};

function ReadOnlyListRow({title, description}: ReadOnlyListRowProps) {
    return (
        <MenuItem.Root>
            <MenuItem.Row>
                <MenuItem.Leading>
                    <UserAvatar accountID={CONST.DEFAULT_NUMBER_ID} />
                </MenuItem.Leading>
                <MenuItem.Content>
                    <MenuItem.Title forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}>{title}</MenuItem.Title>
                    {!!description && <MenuItem.Description forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}>{description}</MenuItem.Description>}
                </MenuItem.Content>
            </MenuItem.Row>
        </MenuItem.Root>
    );
}

export default ReadOnlyListRow;
