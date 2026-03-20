import React from 'react';
import {View} from 'react-native';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import AnimatedSection from './AnimatedSection';

const NAVIGATION_LIBRARIES = [
    {name: '@react-navigation/native', version: '7.1.10'},
    {name: '@react-navigation/native-stack', version: '7.3.14'},
    {name: '@react-navigation/stack', version: '7.3.3'},
    {name: '@react-navigation/material-top-tabs', version: '7.2.13'},
];

function NavigationLibrariesSection() {
    const styles = useThemeStyles();

    return (
        <AnimatedSection title="Czego używamy do obsługi nawigacji">
            {NAVIGATION_LIBRARIES.map((lib) => (
                <View
                    key={lib.name}
                    style={[styles.flexRow, styles.justifyContentBetween, styles.pv3, styles.borderBottom]}
                >
                    <Text style={[styles.textStrong, styles.flex1, {fontSize: 20}]}>{lib.name}</Text>
                    <Text style={[styles.textSupporting, {fontSize: 18}]}>{lib.version}</Text>
                </View>
            ))}
        </AnimatedSection>
    );
}

export default NavigationLibrariesSection;
