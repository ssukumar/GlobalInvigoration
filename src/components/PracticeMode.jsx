import React, { useState, useEffect, useRef } from 'react';
import './game/Game.css';

const PracticeMode = ({ onPracticeComplete }) => {
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(8); // Will be set to random duration when practice starts
  const [score, setScore] = useState(0);
  const [lastClicked, setLastClicked] = useState(null);
  const [gamePhase, setGamePhase] = useState('circles'); // 'circles' or 'coin'
  const [coinClicks, setCoinClicks] = useState(0);
  const [coinVisible, setCoinVisible] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalCoinsCollected, setTotalCoinsCollected] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showSpeedWarning, setShowSpeedWarning] = useState(false);
  const [showPlusTwenty, setShowPlusTwenty] = useState(false);
  const canvasRef = useRef(null);
  const gameCompletedRef = useRef(false);
  const lastBarSwitchTime = useRef(null);
  const speedWarningTimeout = useRef(null);

  // Key sequence state
  const [keySequence, setKeySequence] = useState([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);

  const totalRounds = 2; // Practice mode only has 2 trials

  // Generate random round duration (8, 10, or 12 seconds)
  const getRandomRoundDuration = () => {
    const durations = [8, 10, 12];
    return durations[Math.floor(Math.random() * durations.length)];
  };

  // Generate random key sequence
  const generateKeySequence = () => {
    const keys = ['w', 'a', 's', 'd'];
    const sequence = [];
    const sequenceLength = 10; // Always 10 keys
    
    for (let i = 0; i < sequenceLength; i++) {
      sequence.push(keys[Math.floor(Math.random() * keys.length)]);
    }
    
    setKeySequence(sequence);
    setCurrentKeyIndex(0);
  };

  // Bar dimensions
  const barWidth = canvasSize.width * 0.1;
  const barHeight = canvasSize.height;

  // Bar positions (left and right edges)
  const leftBar = {
    x: 0,
    y: 0,
    width: barWidth,
    height: barHeight
  };
  const rightBar = {
    x: canvasSize.width - barWidth,
    y: 0,
    width: barWidth,
    height: barHeight
  };

  // Coin position (center of screen, moved up slightly)
  const coinPosition = {
    x: canvasSize.width / 2,
    y: canvasSize.height / 2 - 60
  };

  const coinRadius = Math.min(canvasSize.width, canvasSize.height) * 0.12;

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer for circle phase
  useEffect(() => {
    if (gameActive && gamePhase === 'circles') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGamePhase('coin');
            setCoinVisible(true);
            generateKeySequence(); // Generate new sequence for this round
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameActive, gamePhase]);

  // Handle keyboard input for coin interaction
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!gameActive || gamePhase !== 'coin' || !coinVisible || keySequence.length === 0) return;
      
      const pressedKey = event.key.toLowerCase();
      const expectedKey = keySequence[currentKeyIndex];
      
      if (pressedKey === expectedKey) {
        setCurrentKeyIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= keySequence.length) {
            // Sequence completed, coin collected
            setScore(prev => prev + 100);
            setShowPlusTwenty(true);
            // Hide +20 animation after 2 seconds
            setTimeout(() => {
              setShowPlusTwenty(false);
            }, 2000);
            setTotalCoinsCollected(prev => prev + 1);
            if (currentRound >= totalRounds) {
              // Practice complete - return to instructions
              setGameActive(false);
              setKeySequence([]); // Clear sequence when practice is complete
              if (!gameCompletedRef.current) {
                gameCompletedRef.current = true;
                setTimeout(() => {
                  onPracticeComplete();
                }, 2000); // Wait for +20 animation to finish
              }
            } else {
              // Start next round
              setCurrentRound(prev => prev + 1);
              setGamePhase('circles');
              setTimeLeft(getRandomRoundDuration());
              setCoinVisible(false);
              setCoinClicks(0);
              setLastClicked(null);
              setKeySequence([]); // Clear sequence for next round
            }
            return 0; // Reset for next round
          }
          return nextIndex;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameActive, gamePhase, coinVisible, currentRound, totalRounds, score, totalCoinsCollected, onPracticeComplete, keySequence, currentKeyIndex]);

  // Handle mouse movement for bar hover detection
  const handleMouseMove = (event) => {
    if (!gameActive) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Bar hover logic (no points, just visual feedback)
    if (
      x >= leftBar.x && x <= leftBar.x + leftBar.width &&
      y >= leftBar.y && y <= leftBar.y + leftBar.height
    ) {
      if (lastClicked !== 'left') {
        setLastClicked('left');
        lastBarSwitchTime.current = Date.now();
        // Clear any existing warning when switching bars
        setShowSpeedWarning(false);
        if (speedWarningTimeout.current) {
          clearTimeout(speedWarningTimeout.current);
        }
        // Set warning to appear after 2 seconds on this bar
        speedWarningTimeout.current = setTimeout(() => {
          setShowSpeedWarning(true);
        }, 2000);
      }
    } else if (
      x >= rightBar.x && x <= rightBar.x + rightBar.width &&
      y >= rightBar.y && y <= rightBar.y + rightBar.height
    ) {
      if (lastClicked !== 'right') {
        setLastClicked('right');
        lastBarSwitchTime.current = Date.now();
        // Clear any existing warning when switching bars
        setShowSpeedWarning(false);
        if (speedWarningTimeout.current) {
          clearTimeout(speedWarningTimeout.current);
        }
        // Set warning to appear after 2 seconds on this bar
        speedWarningTimeout.current = setTimeout(() => {
          setShowSpeedWarning(true);
        }, 2000);
      }
    }
  };

  // Start game when component mounts
  useEffect(() => {
    setGameActive(true);
    setTimeLeft(getRandomRoundDuration()); // Set random duration for first round
  }, []);

  // Cleanup speed warning timeout on unmount
  useEffect(() => {
    return () => {
      if (speedWarningTimeout.current) {
        clearTimeout(speedWarningTimeout.current);
      }
    };
  }, []);

  // Draw the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (gamePhase === 'circles') {
      // Always draw bars during circles phase
      // Draw left bar
      ctx.beginPath();
      ctx.rect(leftBar.x, leftBar.y, leftBar.width, leftBar.height);
      ctx.fillStyle = lastClicked === 'left' ? '#27ae60' : '#3498db';
      ctx.fill();
      ctx.strokeStyle = '#2980b9';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw right bar
      ctx.beginPath();
      ctx.rect(rightBar.x, rightBar.y, rightBar.width, rightBar.height);
      ctx.fillStyle = lastClicked === 'right' ? '#27ae60' : '#3498db';
      ctx.fill();
      ctx.strokeStyle = '#2980b9';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw gray circle with question mark when 3 seconds or less remain
      if (timeLeft <= 3) {
        // Draw gray circle at coin position
        ctx.beginPath();
        ctx.arc(coinPosition.x, coinPosition.y, coinRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#808080'; // Gray color
        ctx.fill();
        ctx.strokeStyle = '#606060'; // Darker gray border
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw question mark in the center of the circle
        ctx.fillStyle = '#ffffff'; // White text
        ctx.font = `bold ${coinRadius * 0.8}px "Arial", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', coinPosition.x, coinPosition.y);
      }

      // Draw score (top right, outside bars)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${score}`, canvasSize.width - barWidth - 20, 50);

      // Draw instructions
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Move your cursor back and forth between the bars!', canvasSize.width / 2, canvasSize.height - 50);

      // Draw speed warning if active
      if (showSpeedWarning) {
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 20px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Move Faster!', canvasSize.width / 2, canvasSize.height - 100);
      }

      // Draw +100 animation if active
      if (showPlusTwenty) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+100', canvasSize.width / 2, canvasSize.height / 2 - 100);
      }
    } else if (gamePhase === 'coin') {
      // No bars drawn during coin phase - participant focuses only on coin

      // Draw coin
      if (coinVisible) {
        // Main coin body with gradient
        const gradient = ctx.createRadialGradient(
          coinPosition.x - coinRadius * 0.3, 
          coinPosition.y - coinRadius * 0.3, 
          0,
          coinPosition.x, 
          coinPosition.y, 
          coinRadius
        );
        gradient.addColorStop(0, '#FFD700'); // Bright gold center
        gradient.addColorStop(0.7, '#FFA500'); // Orange gold
        gradient.addColorStop(1, '#FF8C00'); // Darker orange edge
        
        ctx.beginPath();
        ctx.arc(coinPosition.x, coinPosition.y, coinRadius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Coin border
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Simple dark vertical bar in the middle
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(
          coinPosition.x - coinRadius * 0.1, 
          coinPosition.y - coinRadius * 0.4, 
          coinRadius * 0.2, 
          coinRadius * 0.8
        );
        
        // Border around the vertical bar
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          coinPosition.x - coinRadius * 0.1, 
          coinPosition.y - coinRadius * 0.4, 
          coinRadius * 0.2, 
          coinRadius * 0.8
        );
        
        // Display reward value curved around top of coin like US currency
        const text = '100';
        const fontSize = coinRadius * 0.4;
        ctx.font = `bold ${fontSize}px "Arial", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate position for curved text at top of coin
        const textRadius = coinRadius * 0.7; // Distance from center to text
        // Adjust angle spread based on number of characters (same as main game)
        const baseSpread = 0.055; // Base spread in terms of π
        const charSpread = 0.025; // Additional spread per character
        const totalSpread = baseSpread + (charSpread * (text.length - 1));
        const startAngle = -Math.PI * (0.5 + totalSpread); // Start angle for text curve
        const endAngle = -Math.PI * (0.5 - totalSpread); // End angle for text curve
        const angleStep = (endAngle - startAngle) / (text.length - 1);
        
        // Draw each character along the curve
        for (let i = 0; i < text.length; i++) {
          const angle = startAngle + (angleStep * i);
          const charX = coinPosition.x + Math.cos(angle) * textRadius;
          const charY = coinPosition.y + Math.sin(angle) * textRadius;
          
          ctx.save();
          ctx.translate(charX, charY);
          ctx.rotate(angle + Math.PI / 2); // Rotate character to follow curve
          
          // Draw shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillText(text[i], 1, 1);
          
          // Draw main character
          ctx.fillStyle = '#8B4513'; // Dark brown matching the vertical bar
          ctx.fillText(text[i], 0, 0);
          
          ctx.restore();
        }
      }

      // Draw key sequence display
      if (keySequence.length > 0) {
        // Current key display (only if sequence not completed)
        if (currentKeyIndex < keySequence.length) {
          const currentKey = keySequence[currentKeyIndex];
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 48px "Arial", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(currentKey.toUpperCase(), coinPosition.x, coinPosition.y + coinRadius + 50);
        }
        
        // Progress bar for key sequence
        const progressBarWidth = coinRadius * 4;
        const progressBarHeight = 30;
        const progressBarX = coinPosition.x - progressBarWidth / 2;
        const progressBarY = coinPosition.y + coinRadius + 100;
        const progressFill = (currentKeyIndex / keySequence.length) * progressBarWidth;

        // Progress bar background
        ctx.fillStyle = '#34495e';
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

        // Progress bar fill
        if (currentKeyIndex > 0) {
          const gradient = ctx.createLinearGradient(progressBarX, progressBarY, progressBarX + progressBarWidth, progressBarY);
          gradient.addColorStop(0, '#27ae60');
          gradient.addColorStop(1, '#2ecc71');
          ctx.fillStyle = gradient;
          ctx.fillRect(progressBarX, progressBarY, progressFill, progressBarHeight);
        }

        // Progress bar border
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
      }

      // Draw score (top right)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${score}`, canvasSize.width - 20, 50);

      // Draw instructions
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", "Courier New", monospace';
      ctx.textAlign = 'center';
      if (keySequence.length > 0) {
        ctx.fillText('Press the highlighted keys in sequence to collect the coin!', canvasSize.width / 2, canvasSize.height - 50);
      } else {
        ctx.fillText('Get ready to follow the key sequence!', canvasSize.width / 2, canvasSize.height - 50);
      }

      // Draw +100 animation if active
      if (showPlusTwenty) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+100', canvasSize.width / 2, canvasSize.height / 2 - 100);
      }
    }

  }, [timeLeft, score, lastClicked, gamePhase, coinVisible, coinClicks, currentRound, totalRounds, canvasSize, showSpeedWarning, showPlusTwenty, keySequence, currentKeyIndex]);

  return (
    <div className="game-container">
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseMove={handleMouseMove}
          className="game-canvas"
          style={{ width: '100vw', height: '100vh', display: 'block' }}
        />
      </div>
    </div>
  );
};

export default PracticeMode; 