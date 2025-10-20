/**
 * Mock implementation of hand-landmarker.js for testing
 */

/* global jest */

// Default mock hand detection results
const mockHandData = {
    handednesses: [
        [{categoryName: 'Right', score: 0.95}],
        [{categoryName: 'Left', score: 0.92}]
    ],
    landmarks: [
        // Right hand landmarks (0-20)
        [
            {x: 0.5, y: 0.6, z: 0.1}, // wrist (0)
            {x: 0.55, y: 0.58, z: 0.08}, // thumb_cmc (1)
            {x: 0.6, y: 0.56, z: 0.05}, // thumb_mcp (2)
            {x: 0.65, y: 0.54, z: 0.02}, // thumb_ip (3)
            {x: 0.7, y: 0.52, z: -0.01}, // thumb_tip (4)
            {x: 0.53, y: 0.5, z: 0.03}, // index_mcp (5)
            {x: 0.57, y: 0.45, z: 0.0}, // index_pip (6)
            {x: 0.61, y: 0.42, z: -0.03}, // index_dip (7)
            {x: 0.65, y: 0.39, z: -0.05}, // index_tip (8)
            {x: 0.51, y: 0.52, z: 0.03}, // middle_mcp (9)
            {x: 0.54, y: 0.47, z: 0.0}, // middle_pip (10)
            {x: 0.57, y: 0.44, z: -0.03}, // middle_dip (11)
            {x: 0.6, y: 0.41, z: -0.05}, // middle_tip (12)
            {x: 0.49, y: 0.54, z: 0.03}, // ring_mcp (13)
            {x: 0.51, y: 0.49, z: 0.0}, // ring_pip (14)
            {x: 0.53, y: 0.46, z: -0.03}, // ring_dip (15)
            {x: 0.55, y: 0.43, z: -0.05}, // ring_tip (16)
            {x: 0.47, y: 0.56, z: 0.03}, // pinky_mcp (17)
            {x: 0.48, y: 0.51, z: 0.0}, // pinky_pip (18)
            {x: 0.49, y: 0.48, z: -0.03}, // pinky_dip (19)
            {x: 0.5, y: 0.45, z: -0.05} // pinky_tip (20)
        ],
        // Left hand landmarks (0-20)
        [
            {x: 0.3, y: 0.6, z: 0.1}, // wrist (0)
            {x: 0.25, y: 0.58, z: 0.08}, // thumb_cmc (1)
            {x: 0.2, y: 0.56, z: 0.05}, // thumb_mcp (2)
            {x: 0.15, y: 0.54, z: 0.02}, // thumb_ip (3)
            {x: 0.1, y: 0.52, z: -0.01}, // thumb_tip (4)
            {x: 0.27, y: 0.5, z: 0.03}, // index_mcp (5)
            {x: 0.23, y: 0.45, z: 0.0}, // index_pip (6)
            {x: 0.19, y: 0.42, z: -0.03}, // index_dip (7)
            {x: 0.15, y: 0.39, z: -0.05}, // index_tip (8)
            {x: 0.29, y: 0.52, z: 0.03}, // middle_mcp (9)
            {x: 0.26, y: 0.47, z: 0.0}, // middle_pip (10)
            {x: 0.23, y: 0.44, z: -0.03}, // middle_dip (11)
            {x: 0.2, y: 0.41, z: -0.05}, // middle_tip (12)
            {x: 0.31, y: 0.54, z: 0.03}, // ring_mcp (13)
            {x: 0.29, y: 0.49, z: 0.0}, // ring_pip (14)
            {x: 0.27, y: 0.46, z: -0.03}, // ring_dip (15)
            {x: 0.25, y: 0.43, z: -0.05}, // ring_tip (16)
            {x: 0.33, y: 0.56, z: 0.03}, // pinky_mcp (17)
            {x: 0.32, y: 0.51, z: 0.0}, // pinky_pip (18)
            {x: 0.31, y: 0.48, z: -0.03}, // pinky_dip (19)
            {x: 0.3, y: 0.45, z: -0.05} // pinky_tip (20)
        ]
    ],
    worldLandmarks: [
        // Right hand world landmarks
        [
            {x: 0.01, y: -0.01, z: 0.0}, // wrist (0)
            {x: 0.015, y: -0.01, z: -0.01}, // thumb_cmc (1)
            // ... and so on for all 21 landmarks with relative coordinates
            {x: 0.02, y: -0.015, z: -0.015}, // thumb_tip (4)
            {x: 0.005, y: -0.02, z: -0.01}, // index_tip (8)
            {x: 0.0, y: -0.02, z: -0.01}, // middle_tip (12)
            {x: -0.005, y: -0.02, z: -0.01}, // ring_tip (16)
            {x: -0.01, y: -0.02, z: -0.01} // pinky_tip (20)
        ],
        // Left hand world landmarks
        [
            {x: -0.01, y: -0.01, z: 0.0}, // wrist (0)
            {x: -0.015, y: -0.01, z: -0.01}, // thumb_cmc (1)
            // ... and so on for all 21 landmarks with relative coordinates
            {x: -0.02, y: -0.015, z: -0.015}, // thumb_tip (4)
            {x: -0.005, y: -0.02, z: -0.01}, // index_tip (8)
            {x: 0.0, y: -0.02, z: -0.01}, // middle_tip (12)
            {x: 0.005, y: -0.02, z: -0.01}, // ring_tip (16)
            {x: 0.01, y: -0.02, z: -0.01} // pinky_tip (20)
        ]
    ]
};

// Fill in all landmarks with consistent values where not specifically defined above
for (let hand = 0; hand < 2; hand++) {
    for (let i = 0; i < 21; i++) {
        if (!mockHandData.worldLandmarks[hand][i]) {
            const x = hand === 0 ? 0.01 - (i * 0.001) : -0.01 + (i * 0.001);
            mockHandData.worldLandmarks[hand][i] = {
                x: x,
                y: -0.01 - ((i % 5) * 0.002),
                z: -0.005 - (Math.floor(i / 5) * 0.002)
            };
        }
    }
}

// Mock return values and functions
let currentMockHandData = mockHandData;
let modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// Create mock detect function
const detect = jest.fn(() => {
    // Return empty result if no hands detected
    if (currentMockHandData === null) {
        return {handednesses: [], landmarks: [], worldLandmarks: []};
    }
    return currentMockHandData;
});

// Create mock setModelAssetPath function
const setModelAssetPath = jest.fn(path => {
    modelAssetPath = path;
    return Promise.resolve();
});

// Export helper functions to control mock behavior in tests
const mockHelpers = {
    // Set custom hand data for testing specific scenarios
    setMockHandData: handData => {
        currentMockHandData = handData;
    },
    // Clear hand data (simulate no hands detected)
    clearHandData: () => {
        currentMockHandData = {handednesses: [], landmarks: [], worldLandmarks: []};
    },
    // Reset to default mock data
    resetHandData: () => {
        currentMockHandData = mockHandData;
        return currentMockHandData;
    },
    // Get the current model path
    getModelPath: () => modelAssetPath
};

export {detect, setModelAssetPath, modelAssetPath, mockHelpers};
