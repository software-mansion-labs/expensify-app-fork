/**
 * A row of buttons that picks one value of a setting of the mock server.
 */
import Button from '@components/Button';
import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

type Option<TValue> = {
    value: TValue;
    label: string;
};

type OptionButtonsProps<TValue> = {
    title: string;
    options: Array<Option<TValue>>;
    selectedValue: TValue | undefined;
    onSelect: (value: TValue) => void;
};

function OptionButtons<TValue extends string | number>({title, options, selectedValue, onSelect}: OptionButtonsProps<TValue>) {
    const styles = useThemeStyles();
    return (
        <View style={styles.mt4}>
            <Text style={[styles.textLabelSupporting, styles.mb2]}>{title}</Text>
            <View style={[styles.flexRow, styles.flexWrap, styles.gap2]}>
                {options.map((option) => (
                    <Button
                        key={option.value}
                        size={CONST.BUTTON_SIZE.SMALL}
                        variant={option.value === selectedValue ? CONST.BUTTON_VARIANT.SUCCESS : undefined}
                        onPress={() => onSelect(option.value)}
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CHANGE_MOCK_SERVER}
                    >
                        <Button.Text>{option.label}</Button.Text>
                    </Button>
                ))}
            </View>
        </View>
    );
}

export default OptionButtons;
