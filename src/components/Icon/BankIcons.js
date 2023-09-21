import _ from 'underscore';
import * as Expensicons from './Expensicons';
import variables from '../../styles/variables';

/**
 * Returns matching asset icon for bankName
 * @param {String} bankName
 * @param {Boolean} isCard
 * @returns {Object}
 */

function getAssetIcon(bankName, isCard) {
    return '../../../assets/images/bankicons/american-express.svg';
}

/**
 * Returns Bank Icon Object that matches to existing bank icons or default icons
 * @param {String} bankName
 * @param {Boolean} [isCard = false]
 * @returns {Object} Object includes props icon, iconSize only if applicable
 */

export default function getBankIcon(bankName, isCard) {
    const bankIcon = {
        icon: '../../../assets/images/bankicons/american-express.svg',
    };

    if (bankName) {
        bankIcon.icon = getAssetIcon(bankName.toLowerCase(), isCard);
    }

    // For default Credit Card icon the icon size should not be set.
    if (!_.contains([Expensicons.CreditCard], bankIcon.icon)) {
        bankIcon.iconSize = variables.iconSizeExtraLarge;
    }

    return bankIcon;
}
