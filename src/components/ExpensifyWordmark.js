import React from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';
import _ from 'underscore';
import CONST from '../CONST';
import withWindowDimensions, {windowDimensionsPropTypes} from './withWindowDimensions';
import themeColors from '../styles/themes/default';
import styles from '../styles/styles';
import * as StyleUtils from '../styles/StyleUtils';
import variables from '../styles/variables';
import useEnvironment from '../hooks/useEnvironment';

const propTypes = {
    /** Additional styles to add to the component */
    style: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.object), PropTypes.object]),

    ...windowDimensionsPropTypes,
};

const defaultProps = {
    style: {},
};

const logoComponents = {
    [CONST.ENVIRONMENT.DEV]: '../../assets/images/expensify-logo--dev.svg',
    [CONST.ENVIRONMENT.STAGING]: '../../assets/images/expensify-logo--staging.svg',
    [CONST.ENVIRONMENT.PRODUCTION]: '../../assets/images/expensify-wordmark.svg',
};

function ExpensifyWordmark(props) {
    const {environment} = useEnvironment();
    // PascalCase is required for React components, so capitalize the const here
    return (
        <>
            <View
                style={[
                    StyleUtils.getSignInWordmarkWidthStyle(environment, props.isSmallScreenWidth),
                    StyleUtils.getHeight(props.isSmallScreenWidth ? variables.signInLogoHeightSmallScreen : variables.signInLogoHeight),
                    props.isSmallScreenWidth && (environment === CONST.ENVIRONMENT.DEV || environment === CONST.ENVIRONMENT.STAGING) ? styles.ml3 : {},
                    ...(_.isArray(props.style) ? props.style : [props.style]),
                ]}
            />
        </>
    );
}

ExpensifyWordmark.displayName = 'ExpensifyWordmark';
ExpensifyWordmark.defaultProps = defaultProps;
ExpensifyWordmark.propTypes = propTypes;
export default withWindowDimensions(ExpensifyWordmark);
