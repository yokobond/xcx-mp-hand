# MediaPipe Hand Detection Extension for Xcratch
An extension for [Xcratch](https://xcratch.github.io/) that provides hand detection and tracking capabilities using machine learning.

This extension uses MediaPipe's hand landmark detection to track hand movements in real-time through your camera, allowing you to create interactive projects that respond to hand gestures and positions.

## ✨ What You Can Do With This Extension

Play [Example Project](https://xcratch.github.io/editor/#https://yokobond.github.io/xcx-mp-hand/projects/example.sb3) to look at what you can do with "MediaPipe Hand Detection". 
<iframe src="https://xcratch.github.io/editor/player#https://yokobond.github.io/xcx-mp-hand/projects/example.sb3" width="540px" height="460px" allow="camera"></iframe>

* Detect and track up to four hands simultaneously
* Detect hands from static images (stage snapshots or sprite costumes)
* Identify whether detected hands are left or right hands
* Track 21 different landmarks on each hand (fingertips, knuckles, etc.)
* Access X, Y, and Z coordinates for precise hand positioning
* Get relative coordinates for more accurate gesture recognition
* Adjust detection sensitivity and performance settings
* Control camera direction (mirrored or flipped view)

## Privacy Notice

**This extension does not send any image data externally.** All hand detection processing is performed locally in your browser.

## How to Use in Xcratch

This extension can be used with other extension in [Xcratch](https://xcratch.github.io/). 
1. Open [Xcratch Editor](https://xcratch.github.io/editor)
2. Click 'Add Extension' button
3. Select 'Extension Loader' extension
4. Type the module URL in the input field 
```
https://yokobond.github.io/xcx-mp-hand/dist/xcxMPHand.mjs
```
5. Click 'OK' button
6. Now you can use the blocks of this extension

## Hand Landmarks Guide

The extension tracks 21 landmarks (numbered 0-20) on each hand:
- Wrist (0)
- Thumb: CMC (1), MCP (2), IP (3), Tip (4)
- Index finger: MCP (5), PIP (6), DIP (7), Tip (8)
- Middle finger: MCP (9), PIP (10), DIP (11), Tip (12)
- Ring finger: MCP (13), PIP (14), DIP (15), Tip (16)
- Pinky finger: MCP (17), PIP (18), DIP (19), Tip (20)

CMC = Carpometacarpal joint, MCP = Metacarpophalangeal joint, 
PIP = Proximal interphalangeal joint, DIP = Distal interphalangeal joint

## Available Blocks

### Control Blocks
- Start hand detection on camera
- Stop hand detection
- Is hand detecting? (boolean)
- Get/Set hand detection interval time
- Set video transparency
- Set camera direction (mirrored/flipped)

### Detection Blocks
- Detect hand on stage (snapshot detection)
- Detect hand in costume (detect from sprite costume)

### Hand Information
- Number of hands
- Handedness of hand (left/right)

### Position Blocks
- X/Y/Z of landmark
  (the stage coordinates of Scratch)
- Relative X/Y/Z of landmark
  (the real world coordinates with the origin at the hand's geometric center)

### Advanced
- Set model path (for custom models)
- Get model path (retrieve current model path)

## Development

### Install Dependencies

```sh
npm install
```

### Setup Development Environment

Change ```vmSrcOrg``` to your local ```scratch-vm``` directory in ```./scripts/setup-dev.js``` then run setup-dev script to setup development environment.

```sh
npm run setup-dev
```

### Bundle into a Module

Run build script to bundle this extension into a module file which could be loaded on Xcratch.

```sh
npm run build
```

### Watch and Bundle

Run watch script to watch the changes of source files and bundle automatically.

```sh
npm run watch
```

### Test

Run test script to test this extension.

```sh
npm run test
```

## 🏠 Home Page

Open this page from [https://yokobond.github.io/xcx-mp-hand/](https://yokobond.github.io/xcx-mp-hand/)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/yokobond/xcx-mp-hand/issues).
