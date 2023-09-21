import React from 'react';
import FastImage from 'react-native-fast-image';
import defaultPropTypes from './propTypes';
import styles from '../../../../styles/styles';

const AndroidBackgroundImage = require('../../../../../assets/images/home-background--android.svg');

function BackgroundImage(props) {
    return (
        <FastImage
            source={AndroidBackgroundImage}
            pointerEvents={props.pointerEvents}
            style={[styles.signInBackground, {width: props.width}]}
        />
    );
}

BackgroundImage.displayName = 'BackgroundImage';
BackgroundImage.propTypes = defaultPropTypes;

export default BackgroundImage;
