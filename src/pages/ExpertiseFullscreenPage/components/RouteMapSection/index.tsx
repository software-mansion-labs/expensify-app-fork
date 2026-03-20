import React, {useMemo} from 'react';
import {Platform, View} from 'react-native';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import useThemeStyles from '@hooks/useThemeStyles';
import {config} from '@libs/Navigation/linkingConfig/config';
import AnimatedSection from '@pages/ExpertiseFullscreenPage/components/AnimatedSection';
import NAVIGATORS from '@src/NAVIGATORS';
import {buildTree} from './buildTree';
import type {RouteNode, ScreenEntry} from './buildTree';
import TreeNode from './TreeNode';

const MONO_FONT = Platform.select({ios: 'Courier New', android: 'monospace', default: 'monospace'});

const PRIORITY_NAVIGATORS = new Set<string>([NAVIGATORS.RIGHT_MODAL_NAVIGATOR, NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR]);

function getSortTier(node: RouteNode): number {
    if (node.isFullScreen) {
        return 0;
    }
    if (PRIORITY_NAVIGATORS.has(node.name)) {
        return 1;
    }
    return 2;
}

function RouteMapSection() {
    const styles = useThemeStyles();

    const rootNodes = useMemo(() => {
        const screens = config?.screens as Record<string, ScreenEntry> | undefined;
        if (!screens) {
            return [];
        }
        return [...buildTree(screens)].sort((a, b) => getSortTier(a) - getSortTier(b));
    }, []);

    return (
        <AnimatedSection title="Mapa route'ów">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                style={styles.mt3}
            >
                <View>
                    <Text
                        style={{
                            fontFamily: MONO_FONT,
                            fontSize: 12,
                            lineHeight: 22,
                        }}
                    >
                        Root Navigator
                    </Text>
                    {rootNodes.map((node, i) => (
                        <TreeNode
                            // eslint-disable-next-line react/no-array-index-key
                            key={`${node.name}-${i}`}
                            node={node}
                            isLast={i === rootNodes.length - 1}
                            parentPrefixes={[]}
                            isFullScreen={node.isFullScreen}
                        />
                    ))}
                </View>
            </ScrollView>
        </AnimatedSection>
    );
}

export default RouteMapSection;
