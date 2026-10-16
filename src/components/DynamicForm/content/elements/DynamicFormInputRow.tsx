import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import type {ReactNode} from 'react';

import React from 'react';
import {View} from 'react-native';

type DynamicFormInputRowProps = {
    /** The input, with any label or description drawn around it */
    children: ReactNode;

    /** Spans the page edge to edge like a menu row, instead of sitting inside the page padding */
    isMenuRow?: boolean;
};

/** The row every input of a dynamic form sits in. Some inputs, such as CountryPicker, do not pass the FullStory class on, so the whole row is masked. */
function DynamicFormInputRow({children, isMenuRow = false}: DynamicFormInputRowProps) {
    const styles = useThemeStyles();

    return (
        <View
            style={isMenuRow ? [styles.mhn5, styles.pv1] : styles.pv2}
            fsClass={CONST.FULLSTORY.CLASS.MASK}
        >
            {children}
        </View>
    );
}

export default DynamicFormInputRow;
