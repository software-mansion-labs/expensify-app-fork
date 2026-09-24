import Button from '@components/Button';
import Text from '@components/Text';

import useScreenActivityEffect from '@hooks/useScreenActivityEffect';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import BootSplash from '@libs/BootSplash';

import CONST from '@src/CONST';

import React, {Activity, useEffect, useState, useSyncExternalStore} from 'react';
import {View} from 'react-native';

/*
 * The smallest screen that shows the one thing a useScreenActivityEffect call site must not do: share a variable with
 * a plain useEffect. App.tsx renders this instead of the navigation root. Nothing here touches Onyx or navigation.
 */

type Resource = {id: number; close: () => void};

/** What "Pusher" really holds. A resource is open while its id sits here. */
const openResources = new Set<number>();
let nextID = 1;

/** The shared variable. Written by useScreenActivityEffect, cleared by a plain useEffect. This is the trap. */
let shared: Resource | null = null;

const log: string[] = [];

/** The sets above live outside React, so every change publishes a fresh snapshot for the screen to render. */
let snapshot = {log: [] as string[], open: [] as number[]};
const listeners = new Set<() => void>();

function publish() {
    snapshot = {log: [...log], open: [...openResources]};
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return snapshot;
}

function note(line: string) {
    log.unshift(line);
    log.length = Math.min(log.length, 4);
    publish();
}

function open(): Resource {
    if (openResources.size > 0) {
        throw new Error(
            `open(): resource #${[...openResources].join(', #')} is still open and nobody owns it.\n\n` +
                'It was opened by useScreenActivityEffect and stored in a shared variable. A plain useEffect cleared that variable when the screen was covered, ' +
                'because React runs plain effect cleanups on cover. The hook cleanup ran later, on removal, found the variable empty and skipped close(). ' +
                "Mounting again opens a second copy on top of the leaked one. The app's own error boundary shows this page.",
        );
    }
    const id = nextID;
    nextID += 1;
    openResources.add(id);
    publish();
    return {
        id,
        close: () => {
            openResources.delete(id);
            publish();
        },
    };
}

const STEPS_BROKEN = [
    '1. Cover: the screen goes under <Activity mode="hidden">. React runs the plain useEffect cleanup: shared = null. The hook does nothing, the resource stays open. Log: "useEffect cleanup: shared variable = null".',
    '2. Remove widget: the component leaves the tree while hidden. Now the hook cleanup runs, reads shared, finds null, skips close(). The resource is open with no owner. Status turns red.',
    '3. Uncover and mount again: a new Widget calls open(). The demo open() refuses while a leaked resource exists and throws. The error reaches the app\'s ErrorBoundary: "Uh-oh, something went wrong!".',
    'Control: skip step 1 and click Remove on the live screen. Both cleanups run in the same commit, hook first: close() succeeds, then shared = null. This is why the code looks correct in every test that never covers the screen.',
];

const STEPS_FIXED = [
    '1. Cover: the screen goes under <Activity mode="hidden">. There is no plain useEffect, so nothing runs. The hook keeps the resource open.',
    '2. Remove widget: the component leaves the tree while hidden. The hook cleanup runs and calls close() on the resource from its own closure. Status stays green.',
    '3. Uncover and mount again: a new Widget calls open(). Nothing is leaked, so it opens a fresh resource. No error.',
];

function WidgetBroken() {
    useScreenActivityEffect(() => {
        shared = open();
        note(`hook setup: opened #${shared.id}, shared variable set`);
        return () => {
            if (shared) {
                shared.close();
                note(`hook cleanup: closed #${shared.id} via the shared variable`);
                return;
            }
            note('hook cleanup: shared variable is null, close() skipped');
        };
    }, []);

    useEffect(() => {
        return () => {
            shared = null;
            note('useEffect cleanup: shared variable = null');
        };
    }, []);

    return <Text>Widget mounted (broken)</Text>;
}

function WidgetFixed() {
    useScreenActivityEffect(() => {
        const resource = open();
        note(`hook setup: opened #${resource.id}, held in the closure`);
        return () => {
            resource.close();
            note(`hook cleanup: closed #${resource.id} via the closure`);
        };
    }, []);

    return <Text>Widget mounted (fixed)</Text>;
}

function SharedCleanupDemo() {
    const styles = useThemeStyles();
    const theme = useTheme();
    const {log: lines, open: openIDs} = useSyncExternalStore(subscribe, getSnapshot);
    const [isFixed, setIsFixed] = useState(false);
    const [isCovered, setIsCovered] = useState(false);
    const [isMounted, setIsMounted] = useState(true);
    const Widget = isFixed ? WidgetFixed : WidgetBroken;
    const isLeaked = openIDs.length > 0 && !isMounted;

    useEffect(() => {
        BootSplash.hide();
    }, []);

    return (
        <View style={[styles.flex1, styles.p5, styles.gap4, {backgroundColor: theme.appBG}]}>
            <Text style={styles.textHeadlineH2}>useScreenActivityEffect: shared cleanup trap ({isFixed ? 'fixed' : 'broken'})</Text>

            <View style={styles.gap1}>
                <Text style={styles.textLabelSupporting}>SETUP</Text>
                <Text>
                    Screens wrapped in {'<Activity mode="hidden">'} (a chat covered by the RHP) keep their state, but React runs every plain useEffect cleanup on cover and the setup again on
                    reveal. useScreenActivityEffect is a useEffect whose cleanup skips the cover and runs only when the component is really removed. Below, one Widget uses it to open a
                    resource (think: a Pusher subscription).
                </Text>
                {isFixed ? (
                    <Text>Fixed variant: the Widget keeps the resource in the closure of the effect and closes it from there. Nothing else touches it.</Text>
                ) : (
                    <Text>
                        Broken variant: the Widget stores the resource in a module-level variable, shared. Its useScreenActivityEffect cleanup closes whatever shared points to. A plain
                        useEffect next to it sets shared = null in its cleanup. Two cleanups, one variable.
                    </Text>
                )}
            </View>

            <View style={[styles.flexRow, styles.gap2, styles.flexWrap]}>
                <Button onPress={() => setIsCovered((value) => !value)}>
                    <Button.Text>{isCovered ? '1. Uncover' : '1. Cover (open RHP)'}</Button.Text>
                </Button>
                <Button
                    onPress={() => setIsMounted(false)}
                    isDisabled={!isMounted}
                >
                    <Button.Text>2. Remove widget</Button.Text>
                </Button>
                <Button
                    onPress={() => {
                        setIsCovered(false);
                        setIsMounted(true);
                    }}
                    isDisabled={isMounted}
                >
                    <Button.Text>3. Uncover and mount again</Button.Text>
                </Button>
                <Button
                    size={CONST.BUTTON_SIZE.SMALL}
                    onPress={() => {
                        openResources.clear();
                        shared = null;
                        nextID = 1;
                        log.length = 0;
                        publish();
                        setIsFixed((value) => !value);
                        setIsCovered(false);
                        setIsMounted(true);
                    }}
                >
                    <Button.Text>Switch to {isFixed ? 'broken' : 'fixed'}</Button.Text>
                </Button>
            </View>

            <Text style={[styles.textHeadlineH2, {color: isLeaked ? theme.danger : theme.success}]}>
                {openIDs.length === 0 ? 'resource closed' : `resource #${openIDs.join(', #')} OPEN`}
                {isLeaked ? ', nobody owns it (leak)' : ''}
            </Text>

            <View
                style={[
                    styles.p4,
                    styles.gap2,
                    {backgroundColor: theme.cardBG, borderColor: isCovered ? theme.border : theme.success, borderWidth: 2, borderStyle: isCovered ? 'dashed' : 'solid'},
                ]}
            >
                <Text style={styles.textLabelSupporting}>SCREEN {isCovered ? '(covered)' : '(visible)'}</Text>
                <Activity mode={isCovered ? 'hidden' : 'visible'}>{isMounted ? <Widget /> : <Text style={styles.textSupporting}>no widget</Text>}</Activity>
            </View>

            <View style={styles.gap1}>
                <Text style={styles.textLabelSupporting}>CLEANUP LOG</Text>
                {lines.length === 0 ? <Text style={styles.textSupporting}>nothing yet</Text> : null}
                {lines.map((line) => (
                    <Text
                        key={line}
                        style={[styles.textMicroSupporting, line.includes('skipped') && {color: theme.danger}]}
                    >
                        {line}
                    </Text>
                ))}
            </View>

            <View style={styles.gap2}>
                <Text style={styles.textLabelSupporting}>WHAT EACH STEP DOES</Text>
                {(isFixed ? STEPS_FIXED : STEPS_BROKEN).map((line) => (
                    <Text key={line}>{line}</Text>
                ))}
                <Text style={[styles.textLabelSupporting, styles.mt2]}>THE RULE</Text>
                <Text>A useScreenActivityEffect cleanup touches only what its own setup created, through the closure: const r = open(); return () =&gt; r.close().</Text>
                <Text>No module-level variables, no refs written from another effect, no counters shared with a plain useEffect. Then the moment the cleanup runs stops mattering.</Text>
            </View>
        </View>
    );
}

export default SharedCleanupDemo;
