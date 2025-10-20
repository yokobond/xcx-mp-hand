import { blockClass } from "../../src/vm/extensions/block/index.js";
import { mockHelpers } from "../../src/vm/extensions/block/hand-landmarker.js";

jest.mock("../../src/vm/extensions/block/hand-landmarker.js");
jest.mock("../../src/vm/extensions/block/costume-util.js", () => ({
    getCostumeByNameOrNumber: jest.fn((target, costumeName) => {
        const costume = target.sprite.costumes.find(c => c.name === costumeName);
        return costume || null;
    }),
    costumeToDataURL: jest.fn((costume, format) => {
        return Promise.resolve(costume.asset.encodeDataURI());
    })
}));

// Mock browser APIs before tests run
const mockCanvas = {
    width: 480,
    height: 360,
    getContext: jest.fn(() => ({
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({
            data: new Uint8ClampedArray(480 * 360 * 4),
            width: 480,
            height: 360
        }))
    })),
    toDataURL: jest.fn() // Add if needed later
};

global.Image = class {
    constructor() {
        // Simulate async loading behavior for onload
        setTimeout(() => {
            if (this.onload) {
                this.onload();
            }
        }, 0);
    }
    set src(value) {
        // The src is set, image is "loaded"
    }
};

global.document = {
    createElement: jest.fn(type => {
        if (type === 'canvas') {
            return mockCanvas;
        }
        // Handle other element types if necessary
        return {};
    })
};

describe("blockClass", () => {
    // Mock stage object to return from getTargetForStage
    const mockStage = {
        videoTransparency: 50,
        videoState: 'off'  // Using 'off' as the default state
    };

    const runtime = {
        formatMessage: function (msg) {
            return msg.default;
        },
        ioDevices: {
            video: {
                enableVideo: jest.fn(),
                disableVideo: jest.fn(),
                mirror: false,
                getFrame: jest.fn(() => {
                    // Return a mock image data object
                    return { width: 480, height: 360, data: new Uint8ClampedArray(480 * 360 * 4) };
                }),
                setPreviewGhost: jest.fn()
            }
        },
        renderer: {
            requestSnapshot: jest.fn(callback => {
                // Mock a snapshot with a data URL
                callback('data:image/png;base64,mockImageData');
            })
        },
        // Add on method to handle event listeners
        on: jest.fn((event, callback) => {
            // Store the callback if needed for future testing
            if (!runtime._eventListeners) {
                runtime._eventListeners = {};
            }
            if (!runtime._eventListeners[event]) {
                runtime._eventListeners[event] = [];
            }
            runtime._eventListeners[event].push(callback);
        }),
        // Add method to emit events (useful for testing)
        emit: jest.fn((event, ...args) => {
            if (runtime._eventListeners && runtime._eventListeners[event]) {
                runtime._eventListeners[event].forEach(callback => callback(...args));
            }
        }),
        // Storage for event listeners
        _eventListeners: {},
        // Add getTargetForStage method
        getTargetForStage: jest.fn(() => mockStage)
    };

    let block;

    beforeEach(() => {
        block = new blockClass(runtime);
        mockHelpers.resetHandData(); // Reset to default mock data before each test
        
        // Reset the mock stage properties before each test
        mockStage.videoTransparency = 50;
        mockStage.videoState = 'off';
    });

    test("should create an instance of blockClass", () => {
        expect(block).toBeInstanceOf(blockClass);
    });

    // New tests for hand detection functionality
    test("should start and stop hand detection", () => {
        // Start detection
        block.startHandDetection();
        expect(block.isHandDetecting()).toBe(true);
        expect(runtime.ioDevices.video.enableVideo).toHaveBeenCalled();
        
        // Stop detection
        block.stopHandDetection();
        expect(block.isHandDetecting()).toBe(false);
    });

    test("should detect hand on stage", () => {
        // Ensure the mock is reset if needed, though it might not be necessary here
        mockCanvas.getContext().drawImage.mockClear();
        mockCanvas.getContext().getImageData.mockClear();
        
        return block.detectHandOnStage().then((result) => {
            expect(runtime.renderer.requestSnapshot).toHaveBeenCalled();
            // Check if canvas methods were called
            expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
            // After detection, hands data should be available (based on mock)
            expect(block.numberOfHands()).toBe(2); // Assuming mockHelpers.resetHandData() was called in beforeEach
            expect(result).toBe('Hand detected'); // Check the resolved value
        });
    });

    test("should return correct hand landmark coordinates", () => {
        // Get the mock data
        const mockData = mockHelpers.resetHandData();
        // Directly set the hands data on the block instance for this synchronous test
        block.hands = mockData;
        
        // Test X coordinates for right hand wrist (first hand, landmark 0)
        const xCoord = block.handLandmarkX({ HAND_NUMBER: 1, LANDMARK: 0 });
        expect(xCoord).toBe((mockData.landmarks[0][0].x - 0.5) * 480);
        
        // Test Y coordinates for right hand wrist
        const yCoord = block.handLandmarkY({ HAND_NUMBER: 1, LANDMARK: 0 });
        expect(yCoord).toBe((0.5 - mockData.landmarks[0][0].y) * 360);
        
        // Test Z coordinates for right hand wrist
        const zCoord = block.handLandmarkZ({ HAND_NUMBER: 1, LANDMARK: 0 });
        expect(zCoord).toBe(mockData.landmarks[0][0].z * 200);
    });
    
    test("should return correct handedness", () => {
        // Get the mock data
        const mockData = mockHelpers.resetHandData();
        // Directly set the hands data on the block instance for this synchronous test
        block.hands = mockData;
        
        // Test handedness for first hand
        const rightHandedness = block.handedness({ HAND_NUMBER: 1 });
        expect(rightHandedness).toBe("Right");
        
        // Test handedness for second hand
        const leftHandedness = block.handedness({ HAND_NUMBER: 2 });
        expect(leftHandedness).toBe("Left");
    });

    test("should handle no hands detected", () => {
        mockHelpers.clearHandData();
        
        expect(block.numberOfHands()).toBe(0);
        expect(block.handLandmarkX({ HAND_NUMBER: 1, LANDMARK: 0 })).toBe(0);
        expect(block.handedness({ HAND_NUMBER: 1 })).toBe(" ");
    });

    test("should return detection interval time", () => {
        expect(block.getDetectionIntervalTime()).toBe(100); // Default is 100ms
        
        block.setDetectionIntervalTime({ TIME: 200 });
        expect(block.getDetectionIntervalTime()).toBe(200);
    });

    test("should return correct relative hand landmark coordinates", () => {
        // Get the mock data
        const mockData = mockHelpers.resetHandData();
        // Directly set the hands data on the block instance for this synchronous test
        block.hands = mockData;
        
        // Test X coordinates for right hand wrist (first hand, landmark 0)
        const xCoord = block.handLandmarkRelativeX({ HAND_NUMBER: 1, LANDMARK: 0 });
        expect(xCoord).toBe(mockData.worldLandmarks[0][0].x);
        
        // Test Y coordinates for right hand wrist (should be inverted)
        const yCoord = block.handLandmarkRelativeY({ HAND_NUMBER: 1, LANDMARK: 0 });
        expect(yCoord).toBe(-mockData.worldLandmarks[0][0].y);
        
        // Test Z coordinates for right hand wrist
        const zCoord = block.handLandmarkRelativeZ({ HAND_NUMBER: 1, LANDMARK: 0 });
        expect(zCoord).toBe(mockData.worldLandmarks[0][0].z);
        
        // Test second hand (left hand)
        const leftXCoord = block.handLandmarkRelativeX({ HAND_NUMBER: 2, LANDMARK: 0 });
        expect(leftXCoord).toBe(mockData.worldLandmarks[1][0].x);
        
        // Test finger tip coordinates
        const thumbTipXCoord = block.handLandmarkRelativeX({ HAND_NUMBER: 1, LANDMARK: 4 });
        expect(thumbTipXCoord).toBe(mockData.worldLandmarks[0][4].x);
    });
    
    test("should handle relative coordinates when no hands detected", () => {
        mockHelpers.clearHandData();
        
        expect(block.handLandmarkRelativeX({ HAND_NUMBER: 1, LANDMARK: 0 })).toBe(0);
        expect(block.handLandmarkRelativeY({ HAND_NUMBER: 1, LANDMARK: 0 })).toBe(0);
        expect(block.handLandmarkRelativeZ({ HAND_NUMBER: 1, LANDMARK: 0 })).toBe(0);
    });

    // Tests for video state and transparency
    test("should get and set video transparency", () => {
        expect(block.globalVideoTransparency).toBe(50);
        
        block.globalVideoTransparency = 75;
        expect(mockStage.videoTransparency).toBe(75);
        expect(block.globalVideoTransparency).toBe(75);
    });

    test("should get and set video state", () => {
        expect(block.globalVideoState).toBe('off');
        
        block.globalVideoState = 'on';
        expect(mockStage.videoState).toBe('on');
        expect(block.globalVideoState).toBe('on');
    });

    test("should set camera direction", () => {
        // Test mirrored direction
        block.setCameraDirection({ DIRECTION: 'mirrored' });
        expect(runtime.ioDevices.video.mirror).toBe(true);
        
        // Test flipped direction
        block.setCameraDirection({ DIRECTION: 'flipped' });
        expect(runtime.ioDevices.video.mirror).toBe(false);
    });

    test("should detect hand in costume", async () => {
        // Mock target with costumes
        const mockTarget = {
            sprite: {
                costumes: [
                    {
                        name: 'costume1',
                        asset: {
                            encodeDataURI: jest.fn(() => 'data:image/png;base64,mockCostumeData')
                        },
                        dataFormat: 'png'
                    }
                ]
            }
        };

        const mockUtil = {
            target: mockTarget
        };

        const result = await block.detectHandInCostume({ COSTUME: 'costume1' }, mockUtil);
        
        expect(result).toBe('Hand detected');
        // After detection, hands data should be available
        expect(block.numberOfHands()).toBeGreaterThanOrEqual(0);
    });

    test("should handle costume not found", async () => {
        const mockTarget = {
            sprite: {
                costumes: [
                    {
                        name: 'costume1',
                        asset: {
                            encodeDataURI: jest.fn(() => 'data:image/png;base64,mockCostumeData')
                        },
                        dataFormat: 'png'
                    }
                ]
            }
        };

        const mockUtil = {
            target: mockTarget
        };

        const result = await block.detectHandInCostume({ COSTUME: 'nonexistent' }, mockUtil);
        
        expect(result).toBe('Costume not found');
    });
});
