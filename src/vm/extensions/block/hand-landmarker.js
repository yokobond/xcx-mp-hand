import {HandLandmarker, FilesetResolver} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest';

const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
);

let modelAssetPath = `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`;

/**
 * Create hand landmarker
 * @returns {Promise<HandLandmarker>} - a Promise that resolves with a HandLandmarker instance
 */
const createVideoHandLandmarker = async () => {
    const marker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: modelAssetPath,
            delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 4
    });
    return marker;
};

let videoLandLandmarker = await createVideoHandLandmarker();

const createImageHandLandmarker = async () => {
    const marker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: modelAssetPath,
            delegate: 'GPU'
        },
        runningMode: 'IMAGE',
        numHands: 4
    });
    return marker;
};

let imageLandLandmarker = await createImageHandLandmarker();

/**
 * Detect hands
 * @param {ImageData} image - image data
 * @param {string} runningMode - running mode
 * @returns {HandLandmarkerResult} - hand landmark result
 */
const detect = function ({image, runningMode}) {
    if (runningMode === 'IMAGE') {
        const handLandmarkerResult = imageLandLandmarker.detect(image);
        return handLandmarkerResult;
    } else if (runningMode === 'VIDEO') {
        const startTimeMs = performance.now();
        const handLandmarkerResult = videoLandLandmarker.detectForVideo(image, startTimeMs);
        return handLandmarkerResult;
    }
};

/**
 * Set model asset path
 * @param {string} path - model asset path
 */
const setModelAssetPath = async function (path) {
    modelAssetPath = path;
    videoLandLandmarker = await createVideoHandLandmarker();
    imageLandLandmarker = await createImageHandLandmarker();
};

export {detect, setModelAssetPath};
