import MenuItemField from '@components/MenuItem/presets/MenuItemField';

import useThemeStyles from '@hooks/useThemeStyles';

import type {ReadOnlyFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

type ReadOnlyFieldProps = {
    field: ReadOnlyFieldConfig;
};

/** A value shown as a row that cannot be pressed, such as the data that the server already holds */
function ReadOnlyField({field}: ReadOnlyFieldProps) {
    const styles = useThemeStyles();

    // The row draws its own horizontal padding, so it cancels the margin of the form to line up with the other fields
    return (
        <View style={styles.mhn5}>
            <MenuItemField
                name={field.label}
                value={field.value}
                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
            />
        </View>
    );
}

export default ReadOnlyField;
