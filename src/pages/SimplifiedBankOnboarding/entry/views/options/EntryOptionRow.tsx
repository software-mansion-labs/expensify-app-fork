/**
 * An option of the entry page. While the action of the option saves, a spinner takes the place of the chevron and the
 * row cannot be pressed again.
 */
import MenuItem from '@components/MenuItem';

import type IconAsset from '@src/types/utils/IconAsset';
import type WithSentryLabel from '@src/types/utils/SentryLabel';

import React from 'react';

type EntryOptionRowProps = WithSentryLabel & {
    title: string;
    icon: IconAsset;
    onPress: () => void;
    isDisabled?: boolean;

    /** The action of this option is running */
    isRunning?: boolean;
};

function EntryOptionRow({title, icon, onPress, isDisabled = false, isRunning = false, sentryLabel}: EntryOptionRowProps) {
    return (
        <MenuItem.Root
            onPress={onPress}
            isDisabled={isDisabled || isRunning}
            sentryLabel={sentryLabel}
            accessibilityLabel={title}
        >
            <MenuItem.Row>
                <MenuItem.Leading>
                    <MenuItem.Icon src={icon} />
                </MenuItem.Leading>
                <MenuItem.Content>
                    <MenuItem.Title>{title}</MenuItem.Title>
                </MenuItem.Content>
                <MenuItem.Trailing>{isRunning ? <MenuItem.LoadingIndicator /> : <MenuItem.Chevron />}</MenuItem.Trailing>
            </MenuItem.Row>
        </MenuItem.Root>
    );
}

export default EntryOptionRow;
