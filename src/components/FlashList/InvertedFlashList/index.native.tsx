import React from 'react';

import type InvertedFlashListProps from './types';

import FlashList from '..';
import CellRendererComponent from './CellRendererComponent';

function InvertedFlashList<T>(props: InvertedFlashListProps<T>) {
    return (
        <FlashList<T>
            {...props}
            inverted
            isChatList
            CellRendererComponent={CellRendererComponent}
            overrideProps={{...props.overrideProps, isInvertedVirtualizedList: true}}
        />
    );
}

export default InvertedFlashList;
