import {HandLandmarker, FilesetResolver} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest';

const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
);

let modelAssetPath = `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`;

/**
 * runningMode: 'IMAGE' or 'VIDEO'
 */
let runningMode = 'IMAGE';

/**
 * Number of hands to detect
 */
let numHands = 4;

/**
 * Create video hand landmarker
 * @returns {HandLandmarker} - hand landmarker
 */
const createImageHandLandmarker = async () => {
    const marker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: modelAssetPath,
            delegate: 'GPU'
        },
        runningMode: 'IMAGE',
        numHands: numHands
    });
    return marker;
};

let handLandmarker = await createImageHandLandmarker();

/**
 * Detect hands
 * @param {ImageData} image - image data
 * @returns {HandLandmarkerResult} - hand landmark result
 */
const detect = async function (image) {
    if (!handLandmarker) {
        throw new Error('HandLandmarker has not been initialized.');
    }
    if (runningMode !== 'IMAGE') {
        runningMode = 'IMAGE';
        await handLandmarker.setOptions({runningMode: 'IMAGE'});
    }
    const handLandmarkerResult = handLandmarker.detect(image);
    return handLandmarkerResult;
};

const detectForVideo = async function (video) {
    if (!handLandmarker) {
        throw new Error('HandLandmarker has not been initialized.');
    }
    if (runningMode !== 'VIDEO') {
        runningMode = 'VIDEO';
        await handLandmarker.setOptions({runningMode: 'VIDEO'});
    }
    const timestamp = performance.now();
    const handLandmarkerResult = handLandmarker.detectForVideo(video, timestamp);
    return handLandmarkerResult;
};

/**
 * Set model asset path
 * @param {string} path - model asset path
 */
const setModelAssetPath = async function (path) {
    modelAssetPath = path;
    handLandmarker = await createImageHandLandmarker();
};

/**
 * Set number of hands to detect
 * @param {number} num - number of hands
 */
const setNumHands = async function (num) {
    numHands = num;
    if (handLandmarker) {
        await handLandmarker.setOptions({numHands: numHands});
    }
};

/**
 * Get number of hands to detect
 * @returns {number} - number of hands
 */
const getNumHands = function () {
    return numHands;
};

export {detect, detectForVideo, setModelAssetPath, modelAssetPath, setNumHands, getNumHands};
