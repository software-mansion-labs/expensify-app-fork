import React, {useState} from 'react';
import {Platform, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import PressableWithFeedback from '@components/Pressable/PressableWithFeedback';
import Text from '@components/Text';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
import type {RouteNode} from './buildTree';

const MONO_FONT = Platform.select({ios: 'Courier New', android: 'monospace', default: 'monospace'});

type TreeNodeProps = {
    node: RouteNode;
    isLast: boolean;
    /** Each entry = whether the ancestor at that level still has more siblings (draws ┃). */
    parentPrefixes: boolean[];
    /** True only for root-level nodes that belong to FULL_SCREENS_SET. */
    isFullScreen?: boolean;
};

function TreeNode({node, isLast, parentPrefixes, isFullScreen = false}: TreeNodeProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = node.children.length > 0;

    const linePrefix = parentPrefixes.map((active) => (active ? '┃   ' : '    ')).join('');
    const connector = isLast ? '┗━━ ' : '┣━━ ';
    let chevron = '  ';
    if (hasChildren) {
        chevron = isExpanded ? '▼ ' : '▶ ';
    }
    const namePrefix = isFullScreen ? '🖥️  ' : '';
    const routeSuffix = node.path ? `  →  /${node.path}` : '';

    let nodeColor = theme.textSupporting;
    if (isFullScreen) {
        nodeColor = theme.success;
    } else if (node.isSidebar) {
        nodeColor = theme.link;
    } else if (hasChildren || parentPrefixes.length === 0) {
        nodeColor = theme.text;
    }

    const label = (
        <Text
            style={{
                fontFamily: MONO_FONT,
                fontSize: 12,
                lineHeight: 22,
                color: nodeColor,
                fontWeight: isFullScreen ? 'bold' : 'normal',
            }}
        >
            {linePrefix}
            {connector}
            {chevron}
            {namePrefix}
            {node.name}
            {routeSuffix}
        </Text>
    );

    return (
        <View>
            {hasChildren ? (
                <PressableWithFeedback
                    onPress={() => setIsExpanded((prev) => !prev)}
                    role={CONST.ROLE.BUTTON}
                    accessibilityLabel={node.name}
                    hoverDimmingValue={0.8}
                    pressDimmingValue={0.5}
                    style={styles.pv1}
                >
                    {label}
                </PressableWithFeedback>
            ) : (
                <View style={styles.pv1}>{label}</View>
            )}

            {isExpanded && (
                <Animated.View entering={FadeInDown.duration(200)}>
                    {node.children.map((child, i) => (
                        <TreeNode
                            // eslint-disable-next-line react/no-array-index-key
                            key={`${child.name}-${i}`}
                            node={child}
                            isLast={i === node.children.length - 1}
                            parentPrefixes={[...parentPrefixes, !isLast]}
                        />
                    ))}
                </Animated.View>
            )}
        </View>
    );
}

export default TreeNode;
