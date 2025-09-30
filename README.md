# MediaPipe Face Mesh Demo - React Application

A modern React application that demonstrates real-time face detection and verification using MediaPipe Face Mesh and face-api.js. This application includes blink detection, face verification, and liveness detection challenges.

## Features

- **Real-time Face Mesh Detection**: Track 468 facial landmarks using MediaPipe
- **Blink Detection**: Count eye blinks using Eye Aspect Ratio (EAR) algorithm
- **Face Verification**: Compare live video with reference photo using face-api.js
- **Liveness Detection**: Complete 5 interactive challenges (blinks, head movements)
- **Identity Verification**: Continuous identity checking during liveness test
- **Photo Options**: Camera capture or file upload for reference photo
- **Responsive Design**: Works on desktop and mobile devices
- **Docker Support**: Both development and production Docker configurations

## Technology Stack

- **React 18** with TypeScript
- **MediaPipe Face Mesh** for facial landmark detection
- **face-api.js** for face recognition and verification
- **CSS Modules** for component-scoped styling
- **Context API** for state management
- **Docker** with multi-stage builds
- **Nginx** for production serving

## Project Structure

```
react-face-mesh-demo/
├── src/
│   ├── components/           # React components
│   │   ├── PhotoUpload/     # Reference photo upload component
│   │   ├── FaceMeshCanvas/  # Video and canvas display
│   │   ├── BlinkCounter/    # Blink counting display
│   │   └── LivenessDetection/ # Liveness challenges
│   ├── services/            # External service integrations
│   │   ├── mediapipe.service.ts
│   │   └── faceApi.service.ts
│   ├── hooks/               # Custom React hooks
│   │   ├── useFaceDetection.ts
│   │   └── useFaceVerification.ts
│   ├── context/             # React Context for state management
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   └── styles/              # Global styles
├── public/                  # Static files
├── Dockerfile              # Production Docker config
├── Dockerfile.dev          # Development Docker config
├── docker-compose.yml      # Production orchestration
└── docker-compose.dev.yml  # Development orchestration
```

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development without Docker)
- Webcam access (for face detection features)
- Modern web browser with WebRTC support

## Quick Start with Docker

### Production Mode

```bash
# Build and run the production container
docker-compose up --build

# Access the application at http://localhost:3000
```

### Development Mode

```bash
# Build and run the development container with hot reloading
docker-compose -f docker-compose.dev.yml up --build

# Access the application at http://localhost:3000
```

## Local Development (without Docker)

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Usage Instructions

1. **Upload Reference Photo**
   - Click "Take Picture" to capture from webcam
   - Or click "Choose File" to upload an existing photo
   - Ensure the photo clearly shows your face

2. **Start Face Detection**
   - Click "Start Detection" to begin face mesh tracking
   - Grant camera permissions when prompted
   - You should see the face mesh overlay on the video

3. **View Blink Detection**
   - Blinks are automatically counted while detection is active
   - EAR (Eye Aspect Ratio) value is displayed in real-time

4. **Run Liveness Test**
   - Upload a reference photo first
   - Click "Start Liveness Test"
   - Complete the 5 challenges:
     - Blink twice
     - Turn head left
     - Turn head right
     - Look up
     - Look down
   - Identity is continuously verified during the test

## Configuration

### Environment Variables

Create a `.env` file for any environment-specific configuration:

```env
REACT_APP_API_URL=your_api_url
REACT_APP_VERIFICATION_THRESHOLD=0.6
```

### MediaPipe Configuration

Edit `src/services/mediapipe.service.ts` to adjust:
- `maxNumFaces`: Maximum number of faces to detect (default: 1)
- `minDetectionConfidence`: Minimum confidence for face detection (0-1)
- `minTrackingConfidence`: Minimum confidence for face tracking (0-1)

### Face Verification Settings

Edit `src/services/faceApi.service.ts` to adjust:
- `SIMILARITY_THRESHOLD`: Lower values require closer face match (default: 0.6)

## Development Guidelines

### Component Creation

```typescript
// Example component structure
import React from 'react';
import styles from './ComponentName.module.css';

interface ComponentNameProps {
  // Define props
}

export const ComponentName: React.FC<ComponentNameProps> = (props) => {
  // Component logic
  return <div className={styles.container}>...</div>;
};
```

### Custom Hooks

```typescript
// Example custom hook
import { useState, useEffect } from 'react';

export const useCustomHook = (params) => {
  // Hook logic
  return { /* returned values */ };
};
```

### State Management

The application uses React Context API for global state management. See `src/context/AppContext.tsx` for the main application state.

## Performance Optimization

- **Lazy Loading**: Components are loaded on demand
- **Memoization**: React.memo used for expensive components
- **Debouncing**: Face verification runs at intervals, not every frame
- **Canvas Optimization**: Direct canvas manipulation for face mesh drawing

## Browser Compatibility

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14.1+
- Edge 90+

Note: HTTPS or localhost required for camera access.

## Troubleshooting

### Camera Access Issues
- Ensure HTTPS or localhost URL
- Check browser camera permissions
- Close other applications using the camera

### Performance Issues
- Reduce video resolution in MediaPipe settings
- Increase verification interval
- Use Chrome for best performance

### Docker Issues
- Ensure Docker daemon is running
- Check port 3000 is not in use
- Run `docker-compose down` before rebuilding

## Security Considerations

- Face descriptors are not stored permanently
- All processing happens client-side
- HTTPS recommended for production deployment
- Camera permissions required only during use

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is provided as-is for demonstration purposes.