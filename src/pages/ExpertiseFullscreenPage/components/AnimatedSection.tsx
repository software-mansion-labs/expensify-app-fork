import React, {useState} from 'react';
import type {ReactNode} from 'react';
import {View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import Icon from '@components/Icon';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';

type AnimatedSectionProps = {
    title: string;
    children: ReactNode;
};

function AnimatedSection({title, children}: AnimatedSectionProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const icons = useMemoizedLazyExpensifyIcons(['DownArrow', 'UpArrow']);
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <View style={styles.mt4}>
            <PressableWithFeedback
                onPress={() => setIsExpanded((prev) => !prev)}
                style={[styles.pb4, styles.flexRow]}
                role={CONST.ROLE.BUTTON}
                accessibilityLabel={title}
                hoverDimmingValue={1}
                pressDimmingValue={0.2}
            >
                <Text style={[styles.flex1, styles.textStrong, styles.userSelectNone, {fontSize: 22, color: '#166534'}]}>{title}</Text>
                <Icon
                    fill={theme.icon}
                    src={isExpanded ? icons.UpArrow : icons.DownArrow}
                />
            </PressableWithFeedback>
            <View style={styles.collapsibleSectionBorder} />
            {isExpanded && <Animated.View entering={FadeInDown.duration(250)}>{children}</Animated.View>}
        </View>
    );
}

export default AnimatedSection;
