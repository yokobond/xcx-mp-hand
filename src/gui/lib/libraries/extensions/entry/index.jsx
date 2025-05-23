/**
 * This is an extension for Xcratch.
 */

import iconURL from './entry-icon.png';
import insetIconURL from './inset-icon.svg';
import translations from './translations.json';

/**
 * Formatter to translate the messages in this extension.
 * This will be replaced which is used in the React component.
 * @param {object} messageData - data for format-message
 * @returns {string} - translated message for the current locale
 */
let formatMessage = messageData => messageData.defaultMessage;

const entry = {
    get name () {
        return formatMessage({
            id: 'xcxMPHand.entry.name',
            defaultMessage: 'MediaPipe Hand Detection',
            description: 'name of the extension'
        });
    },
    extensionId: 'xcxMPHand',
    extensionURL: 'https://yokobond.github.io/xcx-mp-hand/dist/xcxMPHand.mjs',
    collaborator: 'yokobond',
    iconURL: iconURL,
    insetIconURL: insetIconURL,
    get description () {
        return formatMessage({
            defaultMessage: 'Hand position estimation using machine learning.',
            description: 'Description for this extension',
            id: 'xcxMPHand.entry.description'
        });
    },
    tags: ['ai', 'hand', 'image', 'machine learning', 'ml', 'mediapipe', 'vision'],
    featured: true,
    disabled: false,
    bluetoothRequired: false,
    internetConnectionRequired: false,
    helpLink: 'https://yokobond.github.io/xcx-mp-hand/',
    setFormatMessage: formatter => {
        formatMessage = formatter;
    },
    translationMap: translations
};

export {entry}; // loadable-extension needs this line.
export default entry;
