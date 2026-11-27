/**
 * A value shown as a row that cannot be pressed, such as the data that the server already holds. It owns no input, so
 * the page neither validates nor submits it.
 */
import MenuItemField from '@components/MenuItem/presets/MenuItemField';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import type {Field} from './types';

type ReadOnlyFieldRowProps = {
    label: string;
    value: string;
};

function ReadOnlyFieldRow({label, value}: ReadOnlyFieldRowProps) {
    const styles = useThemeStyles();

    // The row draws its own horizontal padding, so it cancels the margin of the form to line up with the other fields
    return (
        <View style={[styles.mhn5, styles.mb6]}>
            <MenuItemField
                name={label}
                value={value}
                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
            />
        </View>
    );
}

function createReadOnlyField(label: string, value: string): Field {
    return {
        key: `readOnly-${label}`,
        inputIDs: [],
        getErrors: () => ({}),

        render: () => (
            <ReadOnlyFieldRow
                label={label}
                value={value}
            />
        ),
    };
}

export default createReadOnlyField;
