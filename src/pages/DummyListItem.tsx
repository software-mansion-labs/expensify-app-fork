import React from 'react';
import {Text, View} from 'react-native';

type DummyListItemProps = {
    title: string;
    index: number;
};

function DummyListItem({title, index}: DummyListItemProps) {
    console.log('sergei: DummyListItem is re-rendered');

    return (
        <View style={{padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff'}}>
            <Text style={{fontSize: 16}}>{title}</Text>
            <Text style={{fontSize: 12, color: '#888'}}>Index: {index}</Text>
        </View>
    );
}

export default DummyListItem;
