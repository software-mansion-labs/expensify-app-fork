import React from 'react';
import PropTypes from 'prop-types';
import CONST from '../CONST';
import useEnvironment from '../hooks/useEnvironment';

const propTypes = {
    /** Width of logo */
    width: PropTypes.number.isRequired,

    /** Height of logo */
    height: PropTypes.number.isRequired,
};

const logoComponents = {
    [CONST.ENVIRONMENT.DEV]: '../../assets/images/new-expensify-dev.svg',
    [CONST.ENVIRONMENT.STAGING]: '../../assets/images/new-expensify-stg.svg',
    [CONST.ENVIRONMENT.PRODUCTION]: '../../assets/images/new-expensify.svg',
    [CONST.ENVIRONMENT.ADHOC]: '../../assets/images/new-expensify-adhoc.svg',
};

function ExpensifyCashLogo(props) {
    const {environment} = useEnvironment();

    // PascalCase is required for React components, so capitalize the const here
    const LogoComponent = logoComponents[environment];
    return (
        <LogoComponent
            width={props.width}
            height={props.height}
        />
    );
}

ExpensifyCashLogo.displayName = 'ExpensifyCashLogo';
ExpensifyCashLogo.propTypes = propTypes;
export default ExpensifyCashLogo;
