import React from 'react';
import PropTypes from 'prop-types';
import FastImage from 'react-native-fast-image';
import styles from '../../../../styles/styles';
import defaultPropTypes from './propTypes';

const MobileBackgroundImage = require('../../../../../assets/images/home-background--mobile.svg');
const DesktopBackgroundImage = require('../../../../../assets/images/home-background--desktop.svg');

const defaultProps = {
    isSmallScreen: false,
};

const propTypes = {
    /** Is the window width narrow, like on a mobile device */
    isSmallScreen: PropTypes.bool,

    ...defaultPropTypes,
};
function BackgroundImage(props) {
    return props.isSmallScreen ? (
        <FastImage
            source={MobileBackgroundImage}
            pointerEvents={props.pointerEvents}
            width={props.width}
            style={styles.signInBackground}
        />
    ) : (
        <FastImage
            source={DesktopBackgroundImage}
            pointerEvents={props.pointerEvents}
            width={props.width}
            style={styles.signInBackground}
        />
    );
}

BackgroundImage.displayName = 'BackgroundImage';
BackgroundImage.propTypes = propTypes;
BackgroundImage.defaultProps = defaultProps;

export default BackgroundImage;
