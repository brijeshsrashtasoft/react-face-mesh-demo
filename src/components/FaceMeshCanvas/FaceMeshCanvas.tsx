import React, { forwardRef } from 'react';
import styles from './FaceMeshCanvas.module.css';

interface FaceMeshCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  verificationStatus?: {
    match: boolean;
    similarity: string;
  } | null;
}

export const FaceMeshCanvas = forwardRef<HTMLDivElement, FaceMeshCanvasProps>(
  ({ videoRef, canvasRef, verificationStatus }, ref) => {
    return (
      <div ref={ref} className={styles.videoContainer}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={styles.video}
        />
        <canvas
          ref={canvasRef}
          className={styles.canvas}
        />
        {verificationStatus && (
          <div
            className={`${styles.verificationStatus} ${
              verificationStatus.match ? styles.verified : styles.notVerified
            }`}
          >
            <span className={styles.verificationText}>
              {verificationStatus.match
                ? `✅ Verified (${verificationStatus.similarity}% match)`
                : `❌ Not Verified (${verificationStatus.similarity}% match)`}
            </span>
          </div>
        )}
      </div>
    );
  }
);

FaceMeshCanvas.displayName = 'FaceMeshCanvas';