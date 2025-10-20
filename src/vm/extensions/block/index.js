import BlockType from '../../extension-support/block-type';
import ArgumentType from '../../extension-support/argument-type';
import Cast from '../../util/cast';
import translations from './translations.json';
import blockIcon from './block-icon.png';
// import Video from '../../io/video';
import {detect, setModelAssetPath, modelAssetPath} from './hand-landmarker.js';

/**
 * States the video sensing activity can be set to.
 * @readonly
 * @enum {string}
 */
const VideoState = {
    /** Video turned off. */
    OFF: 'off',

    /** Video turned on with default y axis mirroring. */
    ON: 'on',

    /** Video turned on without default y axis mirroring. */
    ON_FLIPPED: 'on-flipped'
};

const Runtime = {PROJECT_LOADED: 'PROJECT_LOADED'};

/**
 * Formatter which is used for translation.
 * This will be replaced which is used in the runtime.
 * @param {object} messageData - format-message object
 * @returns {string} - message for the locale
 */
let formatMessage = messageData => messageData.default;

/**
 * Setup format-message for this extension.
 */
const setupTranslations = () => {
    const localeSetup = formatMessage.setup();
    if (localeSetup && localeSetup.translations[localeSetup.locale]) {
        Object.assign(
            localeSetup.translations[localeSetup.locale],
            translations[localeSetup.locale]
        );
    }
};

const EXTENSION_ID = 'xcxMPHand';

/**
 * URL to get this extension as a module.
 * When it was loaded as a module, 'extensionURL' will be replaced a URL which is retrieved from.
 * @type {string}
 */
let extensionURL = 'https://yokobond.github.io/xcx-mp-hand/dist/xcxMPHand.mjs';

/**
 * Scratch 3.0 blocks for example of Xcratch.
 */
class ExtensionBlocks {
    /**
     * A translation object which is used in this class.
     * @param {FormatObject} formatter - translation object
     */
    static set formatMessage (formatter) {
        formatMessage = formatter;
        if (formatMessage) setupTranslations();
    }

    /**
     * @return {string} - the name of this extension.
     */
    static get EXTENSION_NAME () {
        return formatMessage({
            id: 'xcxMPHand.name',
            default: 'Hand Detection',
            description: 'name of the extension'
        });
    }

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID () {
        return EXTENSION_ID;
    }

    /**
     * URL to get this extension.
     * @type {string}
     */
    static get extensionURL () {
        return extensionURL;
    }

    /**
     * Set URL to get this extension.
     * The extensionURL will be changed to the URL of the loading server.
     * @param {string} url - URL
     */
    static set extensionURL (url) {
        extensionURL = url;
    }

    /**
     * Construct a set of blocks for MP Hand.
     * @param {Runtime} runtime - the Scratch 3.0 runtime.
     */
    constructor (runtime) {
        /**
         * The Scratch 3.0 runtime.
         * @type {Runtime}
         */
        this.runtime = runtime;

        if (runtime.formatMessage) {
            // Replace 'formatMessage' to a formatter which is used in the runtime.
            formatMessage = runtime.formatMessage;
        }

        /**
         * A flag to determine if this extension has been installed in a project.
         * It is set to false the first time getInfo is run.
         * @type {boolean}
         */
        this.firstInstall = true;

        /**
         * A flag to determine if hand detection is currently active.
         * @type {boolean}
         */
        this.handDetecting = false;

        /**
         * The detected hands data from MediaPipe hand landmark.
         * @type {object?}
         */
        this.hands = null;

        /**
         * The interval ID for the detection loop.
         * @type {number}
         */
        this.detectionInterval = null;

        /**
         * The interval time for the detection loop in milliseconds.
         * @type {number}
         */
        this.detectionIntervalTime = 100;

        if (this.runtime.ioDevices) {
            // Configure the video device with values from globally stored locations.
            this.runtime.on(Runtime.PROJECT_LOADED, this.updateVideoDisplay.bind(this));
        }
    }

    /**
     * The transparency setting of the video preview stored in a value
     * accessible by any object connected to the virtual machine.
     * @type {number}
     */
    get globalVideoTransparency () {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            return stage.videoTransparency;
        }
        return 50;
    }

    set globalVideoTransparency (transparency) {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            stage.videoTransparency = transparency;
        }
    }

    /**
     * The video state of the video preview stored in a value accessible by any
     * object connected to the virtual machine.
     * @type {number}
     */
    get globalVideoState () {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            return stage.videoState;
        }
        // Though the default value for the stage is normally 'on', we need to default
        // to 'off' here to prevent the video device from briefly activating
        // while waiting for stage targets to be installed that say it should be off
        return VideoState.OFF;
    }

    set globalVideoState (state) {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            stage.videoState = state;
        }
    }

    /**
     * An array of info on video state options for the "turn video [STATE]" block.
     * @type {object[]}
     * @param {string} name - the translatable name to display in the video state menu
     * @param {string} value - the serializable value stored in the block
     */
    get VIDEO_STATE_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'videoSensing.off',
                    default: 'off',
                    description: 'Option for the "turn video [STATE]" block'
                }),
                value: VideoState.OFF
            },
            {
                name: formatMessage({
                    id: 'videoSensing.on',
                    default: 'on',
                    description: 'Option for the "turn video [STATE]" block'
                }),
                value: VideoState.ON
            },
            {
                name: formatMessage({
                    id: 'videoSensing.onFlipped',
                    default: 'on flipped',
                    description: 'Option for the "turn video [STATE]" block that causes the video to be flipped' +
                        ' horizontally (reversed as in a mirror)'
                }),
                value: VideoState.ON_FLIPPED
            }
        ];
    }

    /**
     * Create data for a menu in scratch-blocks format, consisting of an array
     * of objects with text and value properties. The text is a translated
     * string, and the value is one-indexed.
     * @param {object[]} info - An array of info objects each having a name
     *   property.
     * @return {array} - An array of objects with text and value properties.
     * @private
     */
    _buildMenu (info) {
        return info.map((entry, index) => {
            const obj = {};
            obj.text = entry.name;
            obj.value = entry.value || String(index + 1);
            return obj;
        });
    }

    /**
     * Get the latest values for video transparency and state,
     * and set the video device to use them.
     */
    updateVideoDisplay () {
        this.setVideoTransparency({
            TRANSPARENCY: this.globalVideoTransparency
        });
        this.videoToggle({
            VIDEO_STATE: this.globalVideoState
        });
    }

    getLandmarkMenu () {
        const landmarks = [
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.wrist',
                    default: 'wrist(0)'
                }),
                value: '0'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.thumbCMC',
                    default: 'thumb CMC(1)'
                }),
                value: '1'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.thumbMCP',
                    default: 'thumb MCP(2)'
                }),
                value: '2'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.thumbIP',
                    default: 'thumb IP(3)'
                }),
                value: '3'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.thumbTip',
                    default: 'thumb tip(4)'
                }),
                value: '4'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.indexFingerMCP',
                    default: 'index finger MCP(5)'
                }),
                value: '5'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.indexFingerPIP',
                    default: 'index finger PIP(6)'
                }),
                value: '6'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.indexFingerDIP',
                    default: 'index finger DIP(7)'
                }),
                value: '7'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.indexFingerTip',
                    default: 'index finger tip(8)'
                }),
                value: '8'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.middleFingerMCP',
                    default: 'middle finger MCP(9)'
                }),
                value: '9'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.middleFingerPIP',
                    default: 'middle finger PIP(10)'
                }),
                value: '10'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.middleFingerDIP',
                    default: 'middle finger DIP(11)'
                }),
                value: '11'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.middleFingerTip',
                    default: 'middle finger tip(12)'
                }),
                value: '12'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.ringFingerMCP',
                    default: 'ring finger MCP(13)'
                }),
                value: '13'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.ringFingerPIP',
                    default: 'ring finger PIP(14)'
                }),
                value: '14'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.ringFingerDIP',
                    default: 'ring finger DIP(15)'
                }),
                value: '15'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.ringFingerTip',
                    default: 'ring finger tip(16)'
                }),
                value: '16'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.pinkyFingerMCP',
                    default: 'pinky finger MCP(17)'
                }),
                value: '17'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.pinkyFingerPIP',
                    default: 'pinky finger PIP(18)'
                }),
                value: '18'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.pinkyFingerDIP',
                    default: 'pinky finger DIP(19)'
                }),
                value: '19'
            },
            {
                text: formatMessage({
                    id: 'xcxMPHand.landmarkMenu.pinkyFingerTip',
                    default: 'pinky finger tip(20)'
                }),
                value: '20'
            }
        ];
        return landmarks;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        // Set the video display properties to defaults the first time
        // getInfo is run. This turns on the video device when it is
        // first added to a project, and is overwritten by a PROJECT_LOADED
        // event listener that later calls updateVideoDisplay
        if (this.firstInstall) {
            this.globalVideoState = VideoState.OFF;
            this.globalVideoTransparency = 50;
            this.updateVideoDisplay();
            this.firstInstall = false;
        }
        setupTranslations();
        return {
            id: ExtensionBlocks.EXTENSION_ID,
            name: ExtensionBlocks.EXTENSION_NAME,
            extensionURL: ExtensionBlocks.extensionURL,
            blockIconURI: blockIcon,
            showStatusButton: false,
            blocks: [
                {
                    opcode: 'startHandDetection',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'xcxMPHand.startHandDetection',
                        default: 'start hand detection on camera',
                        description: 'start hand detection on video camera'
                    }),
                    arguments: {
                    }
                },
                {
                    opcode: 'stopHandDetection',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'xcxMPHand.stopHandDetection',
                        default: 'stop hand detection'
                    })
                },
                {
                    opcode: 'isHandDetecting',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'xcxMPHand.isHandDetecting',
                        default: 'is hand detecting'
                    })
                },
                {
                    opcode: 'getDetectionIntervalTime',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    text: formatMessage({
                        id: 'xcxMPHand.getDetectionIntervalTime',
                        default: 'hand detection interval time'
                    })
                },
                {
                    opcode: 'setDetectionIntervalTime',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'xcxMPHand.setDetectionIntervalTime',
                        default: 'set hand detection interval time to [TIME] ms'
                    }),
                    arguments: {
                        TIME: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                {
                    opcode: 'setVideoTransparency',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'videoSensing.setVideoTransparency',
                        default: 'set video transparency to [TRANSPARENCY]',
                        description: 'Controls transparency of the video preview layer'
                    }),
                    arguments: {
                        TRANSPARENCY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 50
                        }
                    }
                },
                '---',
                {
                    opcode: 'detectHandOnStage',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'xcxMPHand.detectHandOnStage',
                        default: 'detect hand on stage'
                    })
                },
                '---',
                {
                    opcode: 'numberOfHands',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'xcxMPHand.numberOfHands',
                        default: 'number of hands'
                    })
                },
                {
                    opcode: 'handedness',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'xcxMPHand.handedness',
                        default: 'handedness of hand #[HAND_NUMBER]'
                    }),
                    arguments: {
                        HAND_NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'handLandmarkX',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'xcxMPHand.handLandmarkX',
                        default: 'x of [LANDMARK] of hand #[HAND_NUMBER]'
                    }),
                    arguments: {
                        HAND_NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        LANDMARK: {
                            type: ArgumentType.STRING,
                            menu: 'LANDMARK'
                        }
                    }
                },
                {
                    opcode: 'handLandmarkY',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'xcxMPHand.handLandmarkY',
                        default: 'y of [LANDMARK] of hand #[HAND_NUMBER]'
                    }),
                    arguments: {
                        HAND_NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        LANDMARK: {
                            type: ArgumentType.STRING,
                            menu: 'LANDMARK'
                        }
                    }
                },
                {
                    opcode: 'handLandmarkZ',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'xcxMPHand.handLandmarkZ',
                        default: 'z of [LANDMARK] of hand #[HAND_NUMBER]'
                    }),
                    arguments: {
                        HAND_NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        LANDMARK: {
                            type: ArgumentType.STRING,
                            menu: 'LANDMARK'
                        }
                    }
                },
                '---',
                {
                    opcode: 'handLandmarkRelativeX',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'xcxMPHand.handLandmarkRelativeX',
                        default: 'relative x of [LANDMARK] of hand #[HAND_NUMBER]'
                    }),
                    arguments: {
                        HAND_NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        LANDMARK: {
                            type: ArgumentType.STRING,
                            menu: 'LANDMARK'
                        }
                    }
                },
                {
                    opcode: 'handLandmarkRelativeY',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'xcxMPHand.handLandmarkRelativeY',
                        default: 'relative y of [LANDMARK] of hand #[HAND_NUMBER]'
                    }),
                    arguments: {
                        HAND_NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        LANDMARK: {
                            type: ArgumentType.STRING,
                            menu: 'LANDMARK'
                        }
                    }
                },
                {
                    opcode: 'handLandmarkRelativeZ',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'xcxMPHand.handLandmarkRelativeZ',
                        default: 'relative z of [LANDMARK] of hand #[HAND_NUMBER]'
                    }),
                    arguments: {
                        HAND_NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        LANDMARK: {
                            type: ArgumentType.STRING,
                            menu: 'LANDMARK'
                        }
                    }
                },
                '---',
                {
                    opcode: 'setModelPath',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'xcxMPHand.setModelPath',
                        default: 'set model path to [PATH]'
                    }),
                    arguments: {
                        PATH: {
                            type: ArgumentType.STRING,
                            defaultValue: modelAssetPath
                        }
                    }
                },
                {
                    opcode: 'getModelPath',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'xcxMPHand.getModelPath',
                        default: 'get model path'
                    }),
                    disableMonitor: true
                }
            ],
            menus: {
                LANDMARK: {
                    acceptReporters: true,
                    items: 'getLandmarkMenu'
                },
                VIDEO_STATE: {
                    acceptReporters: false,
                    items: this._buildMenu(this.VIDEO_STATE_INFO)
                }
            }
        };
    }

    /**
     * A scratch command block handle that configures the video state from
     * passed arguments.
     * @param {object} args - the block arguments
     * @param {VideoState} args.VIDEO_STATE - the video state to set the device to
     */
    videoToggle (args) {
        const state = args.VIDEO_STATE;
        this.globalVideoState = state;
        if (state === VideoState.OFF) {
            this.runtime.ioDevices.video.disableVideo();
        } else {
            this.runtime.ioDevices.video.enableVideo();
            // Mirror if state is ON. Do not mirror if state is ON_FLIPPED.
            this.runtime.ioDevices.video.mirror = state === VideoState.ON;
        }
    }

    /**
     * A scratch command block handle that configures the video preview's
     * transparency from passed arguments.
     * @param {object} args - the block arguments
     * @param {number} args.TRANSPARENCY - the transparency to set the video
     *   preview to
     */
    setVideoTransparency (args) {
        const transparency = Cast.toNumber(args.TRANSPARENCY);
        this.globalVideoTransparency = transparency;
        this.runtime.ioDevices.video.setPreviewGhost(transparency);
    }

    /**
     * Start hand detection with the specified video state.
     */
    startHandDetection () {
        // Turn on the video if it is off
        const state = this.globalVideoState;
        if (state === VideoState.OFF) {
            this.runtime.ioDevices.video.enableVideo();
            // Mirror the video for hand detection
            this.runtime.ioDevices.video.mirror = true;
        }

        if (this.handDetecting) {
            return;
        }

        // Start the detection loop
        this.handDetecting = true;
        const detectFrame = async () => {
            if (!this.handDetecting) {
                return;
            }

            // Get the current video frame
            const image = this.runtime.ioDevices.video.getFrame(
                'image-data', [480, 360]
            );
            if (!image) {
                this.detectionInterval = setTimeout(detectFrame, this.detectionIntervalTime);
                return;
            }
            try {
                // Send the frame to the hand detection model
                const result = await detect(image);
                if (!result.handednesses || !result.handednesses[0]) {
                    this.hands = null;
                } else {
                    this.hands = result;
                }
            } catch (error) {
                console.error('Error detecting hand:', error);
            } finally {
                // Schedule next detection
                this.detectionInterval = setTimeout(detectFrame, this.detectionIntervalTime);
            }
        };

        // Start the detection loop
        this.detectionInterval = setTimeout(detectFrame, this.detectionIntervalTime);
    }

    /**
     * Stop hand detection.
     */
    stopHandDetection () {
        this.handDetecting = false;
        
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        // Clear the hands data
        this.hands = [];
    }

    /**
     * Check if hand detection is currently active.
     * @returns {boolean} - true if hand detection is active
     */
    isHandDetecting () {
        return this.handDetecting;
    }

    /**
     * Get the interval time for the detection loop.
     * @returns {number} - the interval time in milliseconds
     */
    getDetectionIntervalTime () {
        return this.detectionIntervalTime;
    }

    /**
     * Set the interval time for the detection loop.
     * @param {object} args - the block arguments
     * @param {number} args.TIME - the interval time in milliseconds
     */
    setDetectionIntervalTime (args) {
        const time = Cast.toNumber(args.TIME);
        this.detectionIntervalTime = Math.max(0, time);
    }

    /**
     * Detect hand on the stage.
     * @returns {Promise} - a promise that resolves when the hand is detected
     */
    detectHandOnStage () {
        return new Promise(resolve => {
            this.runtime.renderer.requestSnapshot(imageDataURL => {
                const image = new Image();
                image.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 480;
                    canvas.height = 360;
                    const context = canvas.getContext('2d');
                    context.drawImage(image, 0, 0, 480, 360);
                    const imageData = context.getImageData(0, 0, 480, 360);
                    const result = await detect(imageData);
                    this.hands = result;
                    resolve('Hand detected');
                };
                image.src = imageDataURL;
            });
        })
            .catch(error => {
                console.error('Error detecting hand:', error);
                return error.message;
            });
    }

    /**
     * Get the number of detected hands.
     * @returns {number} - the number of detected hands
     */
    numberOfHands () {
        if (!this.hands || !this.hands.handednesses) {
            return 0;
        }
        return this.hands.handednesses.length;
    }

    /**
     * Get the landmark data of a specific landmark on a specific hand.
     * @param {number} handIndex - the hand index (0-based)
     * @param {number} landmarkIndex - the landmark index (0-20)
     * @returns {object} - the landmark data
     */
    handLandmark (handIndex, landmarkIndex) {
        if (!this.hands || !this.hands.handednesses) {
            return null;
        }

        // Check if the hand and landmark exist
        if (handIndex < 0 || handIndex >= this.hands.handednesses.length) return null;
        if (landmarkIndex < 0 || landmarkIndex > 20) return null; // MediaPipe hand has 21 landmarks (0-20)

        return this.hands.landmarks[handIndex][landmarkIndex];
    }

    /**
     * Get the X coordinate of a specific landmark on a specific hand.
     * @param {object} args - the block arguments
     * @param {number} args.HAND_NUMBER - the hand index (1-based)
     * @param {number} args.LANDMARK - the landmark index (0-20)
     * @returns {number} - the X coordinate of the landmark
     */
    handLandmarkX (args) {
        const handIndex = Cast.toNumber(args.HAND_NUMBER) - 1; // Convert to 0-based index
        const landmarkIndex = Cast.toNumber(args.LANDMARK);

        const landmark = this.handLandmark(handIndex, landmarkIndex);
        if (!landmark) return 0;

        // Convert the x coordinate to Scratch coordinate system (center is 0,0, right is positive)
        // MediaPipe coordinates are normalized (0-1) where 0 is left, 1 is right
        const x = (landmark.x - 0.5) * 480; // Scale to Scratch stage width
        return x;
    }

    /**
     * Get the Y coordinate of a specific landmark on a specific hand.
     * @param {object} args - the block arguments
     * @param {number} args.HAND_NUMBER - the hand index (1-based)
     * @param {number} args.LANDMARK - the landmark index (0-20)
     * @returns {number} - the Y coordinate of the landmark
     */
    handLandmarkY (args) {
        const handIndex = Cast.toNumber(args.HAND_NUMBER) - 1; // Convert to 0-based index
        const landmarkIndex = Cast.toNumber(args.LANDMARK);

        const landmark = this.handLandmark(handIndex, landmarkIndex);
        if (!landmark) return 0;
        
        // Convert the y coordinate to Scratch coordinate system (center is 0,0, up is positive)
        // MediaPipe coordinates are normalized (0-1) where 0 is top, 1 is bottom
        const y = (0.5 - landmark.y) * 360; // Scale to Scratch stage height and invert
        
        return y;
    }

    /**
     * Get the Z coordinate of a specific landmark on a specific hand.
     * @param {object} args - the block arguments
     * @param {number} args.HAND_NUMBER - the hand index (1-based)
     * @param {number} args.LANDMARK - the landmark index (0-20)
     * @returns {number} - the Z coordinate of the landmark
     */
    handLandmarkZ (args) {
        const handIndex = Cast.toNumber(args.HAND_NUMBER) - 1; // Convert to 0-based index
        const landmarkIndex = Cast.toNumber(args.LANDMARK);

        const landmark = this.handLandmark(handIndex, landmarkIndex);
        if (!landmark) return 0;
        
        // Z is depth, with negative values being closer to the camera
        // Scale the z value to make it more usable in Scratch
        return landmark.z * 200;
    }

    /**
     * Get the handedness of a specific hand.
     * @param {object} args - the block arguments
     * @param {number} args.HAND_NUMBER - the hand index (1-based)
     * @returns {string} - the handedness of the hand
     */
    handedness (args) {
        const handIndex = Cast.toNumber(args.HAND_NUMBER) - 1; // Convert to 0-based index
        if (!this.hands || !this.hands.handednesses) {
            return ' ';
        }
        if (handIndex < 0 || handIndex >= this.hands.handednesses.length) {
            return ' ';
        }
        return this.hands.handednesses[handIndex][0].categoryName;
    }

    /**
     * Get the relative landmark data of a specific landmark on a specific hand.
     * @param {number} handIndex - the hand index (0-based)
     * @param {number} landmarkIndex - the landmark index (0-20)
     * @returns {object} - the landmark data
     */
    handLandmarkRelative (handIndex, landmarkIndex) {
        if (!this.hands || !this.hands.handednesses) {
            return null;
        }

        // Check if the hand and landmark exist
        if (handIndex < 0 || handIndex >= this.hands.handednesses.length) return null;
        if (landmarkIndex < 0 || landmarkIndex > 20) return null; // MediaPipe hand has 21 landmarks (0-20)

        return this.hands.worldLandmarks[handIndex][landmarkIndex];
    }

    /**
     * Get the relative X coordinate of a specific landmark on a specific hand.
     * @param {object} args - the block arguments
     * @param {number} args.HAND_NUMBER - the hand index (1-based)
     * @param {number} args.LANDMARK - the landmark index (0-20)
     * @returns {number} - the relative X coordinate of the landmark
     */
    handLandmarkRelativeX (args) {
        const handIndex = Cast.toNumber(args.HAND_NUMBER) - 1; // Convert to 0-based index
        const landmarkIndex = Cast.toNumber(args.LANDMARK);

        const landmark = this.handLandmarkRelative(handIndex, landmarkIndex);
        if (!landmark) return 0;
        return landmark.x;
    }

    /**
     * Get the relative Y coordinate of a specific landmark on a specific hand.
     * @param {object} args - the block arguments
     * @param {number} args.HAND_NUMBER - the hand index (1-based)
     * @param {number} args.LANDMARK - the landmark index (0-20)
     * @returns {number} - the relative Y coordinate of the landmark
     */
    handLandmarkRelativeY (args) {
        const handIndex = Cast.toNumber(args.HAND_NUMBER) - 1; // Convert to 0-based index
        const landmarkIndex = Cast.toNumber(args.LANDMARK);

        const landmark = this.handLandmarkRelative(handIndex, landmarkIndex);
        if (!landmark) return 0;
        // Invert the y coordinate for Scratch coordinate system (up is positive)
        return -landmark.y;
    }

    /**
     * Get the relative Z coordinate of a specific landmark on a specific hand.
     * @param {object} args - the block arguments
     * @param {number} args.HAND_NUMBER - the hand index (1-based)
     * @param {number} args.LANDMARK - the landmark index (0-20)
     * @returns {number} - the relative Z coordinate of the landmark
     */
    handLandmarkRelativeZ (args) {
        const handIndex = Cast.toNumber(args.HAND_NUMBER) - 1; // Convert to 0-based index
        const landmarkIndex = Cast.toNumber(args.LANDMARK);

        const landmark = this.handLandmarkRelative(handIndex, landmarkIndex);
        if (!landmark) return 0;
        return landmark.z;
    }

    /**
     * Set the model asset path for hand detection.
     * @param {object} args - the block arguments
     * @param {string} args.PATH - the model asset path
     * @returns {Promise} - a promise that resolve when the model set
     */
    setModelPath (args) {
        const path = Cast.toString(args.PATH).trim();
        if (!path) return;
        return setModelAssetPath(path)
            .then(() => 'Model asset path set successfully')
            .catch(e => {
                console.error(e);
                return e.message;
            });
    }

    /**
     * Get the model asset path.
     * @returns {string} - the model asset path
     */
    getModelPath () {
        return modelAssetPath;
    }
}

export {ExtensionBlocks as default, ExtensionBlocks as blockClass};
