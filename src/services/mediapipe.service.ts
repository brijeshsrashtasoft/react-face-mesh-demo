import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { FaceLandmark, FaceMeshResults } from '../types';

// Declare global types for drawing utilities
declare global {
  interface Window {
    drawConnectors: any;
    drawLandmarks: any;
    FACEMESH_TESSELATION: any;
    FACEMESH_RIGHT_EYE: any;
    FACEMESH_RIGHT_EYEBROW: any;
    FACEMESH_LEFT_EYE: any;
    FACEMESH_LEFT_EYEBROW: any;
    FACEMESH_FACE_OVAL: any;
    FACEMESH_LIPS: any;
  }
}

class FaceDetectionService {
  private faceMesh: FaceMesh | null = null;
  private camera: Camera | null = null;
  private isInitialized = false;

  async loadScripts(): Promise<boolean> {
    try {
      // Load scripts in order
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js');
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils@0.6/control_utils.js');
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js');
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js');
      
      console.log('All MediaPipe scripts loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading MediaPipe scripts:', error);
      return false;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async initialize(onResults: (results: FaceMeshResults) => void): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Load scripts if not already loaded
    const scriptsLoaded = await this.loadScripts();
    if (!scriptsLoaded) {
      throw new Error('Failed to load MediaPipe scripts');
    }

    // Initialize FaceMesh
    this.faceMesh = new (window as any).FaceMesh({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
      }
    });

    if (this.faceMesh) {
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults((results: any) => {
        // Convert results to our FaceMeshResults type
        const convertedResults: FaceMeshResults = {
          image: results.image,
          multiFaceLandmarks: results.multiFaceLandmarks
        };
        onResults(convertedResults);
      });
    }
    this.isInitialized = true;
  }

  async startCamera(videoElement: HTMLVideoElement, onFrame: () => Promise<void>): Promise<void> {
    if (!this.faceMesh) {
      throw new Error('FaceMesh not initialized');
    }

    this.camera = new (window as any).Camera(videoElement, {
      onFrame,
      width: 640,
      height: 480
    });

    if (this.camera) {
      await this.camera.start();
    }
  }

  async processFaceData(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.faceMesh) {
      throw new Error('FaceMesh not initialized');
    }

    await this.faceMesh.send({ image: videoElement });
  }

  stopCamera(): void {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
  }

  drawResults(
    canvasCtx: CanvasRenderingContext2D,
    results: FaceMeshResults,
    landmarks: FaceLandmark[]
  ): void {
    const { 
      drawConnectors, 
      drawLandmarks,
      FACEMESH_TESSELATION,
      FACEMESH_FACE_OVAL,
      FACEMESH_RIGHT_EYE,
      FACEMESH_RIGHT_EYEBROW,
      FACEMESH_LEFT_EYE,
      FACEMESH_LEFT_EYEBROW,
      FACEMESH_LIPS
    } = window;

    // Draw face tesselation
    drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, 
      { color: '#C0C0C070', lineWidth: 1 });
    
    // Draw face oval
    drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, 
      { color: '#E0E0E0', lineWidth: 2 });
    
    // Draw eyes
    drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, 
      { color: '#FF3030' });
    drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, 
      { color: '#FF3030' });
    drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, 
      { color: '#30FF30' });
    drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, 
      { color: '#30FF30' });
    
    // Draw lips
    drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, 
      { color: '#E0E0E0' });
    
    // Draw landmarks
    drawLandmarks(canvasCtx, landmarks, 
      { color: '#FFFFFF', lineWidth: 1, radius: 2 });
  }

  cleanup(): void {
    this.stopCamera();
    this.faceMesh = null;
    this.isInitialized = false;
  }
}

export const mediaPipeService = new FaceDetectionService();