import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import styles from './BlinkCounter.module.css';

interface BlinkCounterProps {
  earValue?: number;
}

export const BlinkCounter: React.FC<BlinkCounterProps> = ({ earValue = 0 }) => {
  const { blinkCount } = useAppContext();
  const [isFlashing, setIsFlashing] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);

  useEffect(() => {
    if (blinkCount > previousCount) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 300);
    }
    setPreviousCount(blinkCount);
  }, [blinkCount, previousCount]);

  return (
    <div className={styles.blinkCounter}>
      <h2>
        Blink Count: 
        <span 
          className={`${styles.blinkCount} ${isFlashing ? styles.blinkFlash : ''}`}
        >
          {blinkCount}
        </span>
      </h2>
      <p>EAR: <span className={styles.earValue}>{earValue.toFixed(3)}</span></p>
    </div>
  );
};