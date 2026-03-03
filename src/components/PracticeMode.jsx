import React, { useState, useEffect, useRef } from 'react';
import { getRandomRoundDuration, getRandomKeySequence, GAME_CONFIG } from '../config/gameConfig';
import './game/Game.css';

const PracticeMode = ({ onPracticeComplete }) => {
  // Game state
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [gamePhase, setGamePhase] = useState('reaching'); // 'reaching' or 'keypress'
  const [coinVisible, setCoinVisible] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalCoinsCollected, setTotalCoinsCollected] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showSpeedWarning, setShowSpeedWarning] = useState(false);
  const [showPlusFifty, setShowPlusFifty] = useState(false);

  // Key sequence state
  const [keySequence, setKeySequence] = useState([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [keyStates, setKeyStates] = useState([]); // 'pending', 'correct', 'incorrect'

  // Cursor position and bar visibility
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [leftBarVisible, setLeftBarVisible] = useState(true);
  const [rightBarVisible, setRightBarVisible] = useState(true);

  // Refs
  const canvasRef = useRef(null);
  const gameCompletedRef = useRef(false);
  const lastMousePosRef = useRef({ x: null, y: null });
  const [dashOffset, setDashOffset] = useState(0);
  const prevBarRef = useRef(null);
  const speedWarningTimeout = useRef(null);
  const barHideTimeoutRef = useRef(null);
  const barHidingRef = useRef(null);
  const prematureExitBarRef = useRef(null);
  const [showBarExitWarning, setShowBarExitWarning] = useState(false);

  const totalRounds = 2; // Practice mode has 2 trials

  // Animation constants
  const DASH_SCALE = 0.28; // Slower dash movement

  // Bar dimensions
  const barWidth = canvasSize.width * 0.1;
  const barHeight = canvasSize.height;

  const leftBar = { x: canvasSize.width * 0.05, y: 0, width: barWidth, height: barHeight };
  const rightBar = { x: canvasSize.width * 0.85, y: 0, width: barWidth, height: barHeight };

  // Coin position (centered, mid-screen)
  const coinPosition = { x: canvasSize.width / 2, y: canvasSize.height / 2 - 120 };

  // Reusable coin pile drawing function (supports practice reward value 30)
  const drawCoinPile = (ctx, rewardValue, cue = false) => {
    if (rewardValue === 0) {
      ctx.beginPath();
      ctx.arc(coinPosition.x, coinPosition.y, 30, 0, 2 * Math.PI);
      ctx.fillStyle = cue ? '#dcdcdc' : '#f0f0f0';
      ctx.fill();
      ctx.strokeStyle = cue ? '#bfbfbf' : '#c0c0c0';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#888888';
      ctx.font = `bold ${24}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('0', coinPosition.x, coinPosition.y - 18);
      return 0;
    }

    let numCoins, baseWidth;
    if (rewardValue === 10) {
      numCoins = 1; baseWidth = 1;
    } else if (rewardValue === 60) {
      numCoins = 6; baseWidth = 3;
    } else if (rewardValue === 100) {
      numCoins = 10; baseWidth = 4;
    } else if (rewardValue === GAME_CONFIG.REWARDS.PRACTICE_VALUE) {
      // Practice value (30) => 3 coins
      numCoins = 3; baseWidth = 2;
    } else {
      // Fallback: show single coin
      numCoins = 1; baseWidth = 1;
    }

    const coinRadiusLocal = Math.max(28, Math.floor(Math.min(canvasSize.width, canvasSize.height) * 0.035));
    const spacing = coinRadiusLocal * 1.8;

    let coinIndex = 0;
    for (let row = 0; row < baseWidth; row++) {
      const coinsInRow = row + 1;
      const rowY = coinPosition.y + (row * spacing * 0.8);
      const rowStartX = coinPosition.x - ((coinsInRow - 1) * spacing) / 2;

      for (let col = 0; col < coinsInRow && coinIndex < numCoins; col++) {
        const coinX = rowStartX + (col * spacing);
        ctx.beginPath();
        ctx.arc(coinX, rowY, coinRadiusLocal, 0, 2 * Math.PI);

        if (cue) {
          const gradient = ctx.createRadialGradient(
            coinX - coinRadiusLocal * 0.3,
            rowY - coinRadiusLocal * 0.3,
            0,
            coinX,
            rowY,
            coinRadiusLocal
          );
          gradient.addColorStop(0, '#e6e6e6');
          gradient.addColorStop(0.7, '#bfbfbf');
          gradient.addColorStop(1, '#9a9a9a');
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.strokeStyle = '#7f7f7f';
          ctx.lineWidth = 2;
          ctx.stroke();

          // central stripe
          ctx.fillStyle = '#8c8c8c';
          const stripeWidth = coinRadiusLocal * 0.12;
          ctx.fillRect(
            coinX - stripeWidth / 2,
            rowY - coinRadiusLocal * 0.55,
            stripeWidth,
            coinRadiusLocal * 1.1
          );
        } else {
          const gradient = ctx.createRadialGradient(
            coinX - coinRadiusLocal * 0.3,
            rowY - coinRadiusLocal * 0.3,
            0,
            coinX,
            rowY,
            coinRadiusLocal
          );
          gradient.addColorStop(0, '#FFD700');
          gradient.addColorStop(0.7, '#FFA500');
          gradient.addColorStop(1, '#FF8C00');
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.strokeStyle = '#FF8C00';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#B8860B';
          ctx.fillRect(
            coinX - coinRadiusLocal * 0.1,
            rowY - coinRadiusLocal * 0.4,
            coinRadiusLocal * 0.2,
            coinRadiusLocal * 0.8
          );
        }

        coinIndex++;
      }
    }

    const pileHeight = baseWidth * spacing * 0.8;

    if (!cue) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 32px "Arial", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${rewardValue} points`, coinPosition.x, coinPosition.y + pileHeight + 30);
    }

    return pileHeight;
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer for reaching phase
  useEffect(() => {
    if (gameActive && gamePhase === 'reaching') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGamePhase('keypress');
            setCoinVisible(true);
            const sequence = getRandomKeySequence();
            setKeySequence(sequence);
            setCurrentKeyIndex(0);
            setKeyStates(new Array(sequence.length).fill('pending'));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameActive, gamePhase]);

  // Handle keyboard input for coin collection
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!gameActive || gamePhase !== 'keypress' || !coinVisible || keySequence.length === 0) return;

      const pressedKey = event.key.toLowerCase();
      const expectedKey = keySequence[currentKeyIndex];

      if (pressedKey === expectedKey) {
        setKeyStates(prev => {
          const newStates = [...prev];
          newStates[currentKeyIndex] = 'correct';
          return newStates;
        });

        setCurrentKeyIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= keySequence.length) {
            // Sequence completed
            setScore(prev => prev + GAME_CONFIG.REWARDS.PRACTICE_VALUE);
            setShowPlusFifty(true);
            setTimeout(() => setShowPlusFifty(false), 2000);
            setTotalCoinsCollected(prev => prev + 1);

            if (currentRound >= totalRounds) {
              // Practice complete
              setGameActive(false);
              setKeySequence([]);
              setKeyStates([]);
              if (!gameCompletedRef.current) {
                gameCompletedRef.current = true;
                setTimeout(() => onPracticeComplete(), 2000);
              }
            } else {
              // Next round
              setCurrentRound(prev => prev + 1);
              setGamePhase('reaching');
              // Set specific durations: 45 seconds for round 1, 20 seconds for round 2
              setTimeLeft(currentRound === 1 ? 45 : 20);
              setCoinVisible(false);
              setLeftBarVisible(true);
              setRightBarVisible(true);
              prevBarRef.current = null;
              setKeySequence([]);
              setKeyStates([]);
            }
            return 0;
          }
          return nextIndex;
        });
      } else {
        setKeyStates(prev => {
          const newStates = [...prev];
          newStates[currentKeyIndex] = 'incorrect';
          return newStates;
        });
        setTimeout(() => {
          setKeyStates(prev => {
            const newStates = [...prev];
            if (newStates[currentKeyIndex] === 'incorrect') {
              newStates[currentKeyIndex] = 'pending';
            }
            return newStates;
          });
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameActive, gamePhase, coinVisible, currentRound, totalRounds, score, onPracticeComplete, keySequence, currentKeyIndex]);

  // Handle mouse movement with dash animation logic
  const handleMouseMove = (event) => {
    if (!gameActive || gamePhase !== 'reaching') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setCursorPosition({ x, y });

    // Determine which bar cursor is in
    const inLeftBar = x >= leftBar.x && x <= leftBar.x + leftBar.width && y >= leftBar.y && y <= leftBar.y + leftBar.height;
    const inRightBar = x >= rightBar.x && x <= rightBar.x + rightBar.width && y >= rightBar.y && y <= rightBar.y + rightBar.height;
    const currentBar = inLeftBar ? 'left' : inRightBar ? 'right' : null;

    // Option A behavior with 500ms delay:
    // - When the cursor enters a bar, that bar disappears after 500ms
    // - If cursor leaves before 500ms, show warning, freeze opposite bar, and RESET the 500ms timer
    // - Cursor must return and stay for a fresh 500ms to hide the bar
    const prevBar = prevBarRef.current;
    
    if (currentBar !== prevBar) {
      // If leaving a bar before hide timeout completes AND bar is still actively hiding, show warning
      if (prevBar !== null && currentBar === null && barHidingRef.current === prevBar) {
        setShowBarExitWarning(true);
        prematureExitBarRef.current = prevBar;
        // Clear the timeout so the bar won't disappear (must restart on return)
        if (barHideTimeoutRef.current) {
          clearTimeout(barHideTimeoutRef.current);
          barHideTimeoutRef.current = null;
        }
        barHidingRef.current = null; // Bar is no longer actively hiding
        // Warning auto-hides after 2 seconds
        setTimeout(() => {
          setShowBarExitWarning(false);
        }, 2000);

        // Keep current bar ref to prevent further changes
        prevBarRef.current = currentBar;
        return;
      }
      
      // If we're returning to the bar that was exited early, restart the timeout
      if (currentBar === prematureExitBarRef.current) {
        setShowBarExitWarning(false);
        // Restart the hide timeout for this bar
        barHidingRef.current = prematureExitBarRef.current;
        
        if (currentBar === 'left') {
          barHideTimeoutRef.current = setTimeout(() => {
            setLeftBarVisible(false);
            prematureExitBarRef.current = null;
            barHidingRef.current = null;
          }, 500);
        } else if (currentBar === 'right') {
          barHideTimeoutRef.current = setTimeout(() => {
            setRightBarVisible(false);
            prematureExitBarRef.current = null;
            barHidingRef.current = null;
          }, 500);
        }
        prevBarRef.current = currentBar;
        return;
      }
      
      // If in recovery mode and cursor goes somewhere else, ignore
      if (prematureExitBarRef.current && currentBar !== prematureExitBarRef.current) {
        prevBarRef.current = currentBar;
        return;
      }
      
      // Clear existing timeout if switching bars normally
      if (barHideTimeoutRef.current) {
        clearTimeout(barHideTimeoutRef.current);
      }
      
      if (currentBar === 'left') {
        setRightBarVisible(true);
        setShowBarExitWarning(false);
        barHidingRef.current = 'left'; // Mark that left bar is now hiding
        
        barHideTimeoutRef.current = setTimeout(() => {
          setLeftBarVisible(false);
          barHidingRef.current = null; // Bar is now hidden, no longer in hiding process
        }, 500);

        setShowSpeedWarning(false);
        if (speedWarningTimeout.current) clearTimeout(speedWarningTimeout.current);
        speedWarningTimeout.current = setTimeout(() => setShowSpeedWarning(true), 2000);
      } else if (currentBar === 'right') {
        setLeftBarVisible(true);
        setShowBarExitWarning(false);
        barHidingRef.current = 'right'; // Mark that right bar is now hiding
        
        barHideTimeoutRef.current = setTimeout(() => {
          setRightBarVisible(false);
          barHidingRef.current = null; // Bar is now hidden, no longer in hiding process
        }, 500);

        setShowSpeedWarning(false);
        if (speedWarningTimeout.current) clearTimeout(speedWarningTimeout.current);
        speedWarningTimeout.current = setTimeout(() => setShowSpeedWarning(true), 2000);
      } else if (currentBar === null) {
        // Moved to neutral - clear the hiding marker
        barHidingRef.current = null;
      }

      prevBarRef.current = currentBar;
    }

    // Advance dashOffset only when cursor moves toward the visible bar
    const lastPos = lastMousePosRef.current;
    if (lastPos.x !== null && lastPos.y !== null) {
      const dx = x - lastPos.x;
      const dy = y - lastPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const movingTowardVisibleBar = (
          (rightBarVisible && dx > 0) ||
          (leftBarVisible && dx < 0)
        );
        if (movingTowardVisibleBar) {
          const TOTAL_PATTERN = 20 + 15; // dash + gap
          setDashOffset(prev => (prev + dist * DASH_SCALE) % TOTAL_PATTERN);
        }
      }
    }

    lastMousePosRef.current = { x, y };
  };

  // Start game on mount
  useEffect(() => {
    setGameActive(true);
    setGamePhase('reaching');
    setTimeLeft(45); // First practice round is 45 seconds
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speedWarningTimeout.current) clearTimeout(speedWarningTimeout.current);
      if (barHideTimeoutRef.current) clearTimeout(barHideTimeoutRef.current);
    };
  }, []);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (gamePhase === 'reaching') {
      // Draw left bar (conditional visibility)
      if (leftBarVisible) {
        ctx.beginPath();
        ctx.rect(leftBar.x, leftBar.y, leftBar.width, leftBar.height);
        ctx.fillStyle = prevBarRef.current === 'left' ? '#27ae60' : '#3498db';
        ctx.fill();
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw right bar (conditional visibility)
      if (rightBarVisible) {
        ctx.beginPath();
        ctx.rect(rightBar.x, rightBar.y, rightBar.width, rightBar.height);
        ctx.fillStyle = prevBarRef.current === 'right' ? '#27ae60' : '#3498db';
        ctx.fill();
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw animated vertical dashed line down the center
      const centerX = canvasSize.width / 2;
      const dashLength = 20;
      const gapLength = 15;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.setLineDash([dashLength, gapLength]);
      ctx.lineDashOffset = -dashOffset;
      ctx.beginPath();
      ctx.moveTo(centerX, -canvasSize.height);
      ctx.lineTo(centerX, canvasSize.height * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw cue coin pile and countdown when timeLeft <= 3
      if (timeLeft <= 3) {
        const rewardValue = GAME_CONFIG.REWARDS.PRACTICE_VALUE;
        const pileHeight = drawCoinPile(ctx, rewardValue, true);

        const countdownNum = Math.max(0, Math.ceil(timeLeft));
        const line1 = `${rewardValue} points`;
        const line2 = `in ${countdownNum}...`;

        const smallFontSize = 32;
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.font = `bold ${smallFontSize}px "Arial", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 6;

        const startY = coinPosition.y + pileHeight + 30;
        ctx.strokeText(line1, coinPosition.x, startY);
        ctx.fillText(line1, coinPosition.x, startY);

        const bigFontSize = smallFontSize;
        ctx.font = `bold ${bigFontSize}px "Arial", sans-serif`;
        const numberY = startY + smallFontSize + 6;
        ctx.strokeText(line2, coinPosition.x, numberY);
        ctx.fillText(line2, coinPosition.x, numberY);
      }

      // Draw cursor (yellow circle)
      ctx.beginPath();
      ctx.arc(cursorPosition.x, cursorPosition.y, 16, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFD700';
      ctx.fill();
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw score
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${score}`, canvasSize.width / 2, 90);

      // Draw instructions
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Move your cursor back and forth between the bars!', canvasSize.width / 2, canvasSize.height - 50);

      // Draw speed warning
      if (showSpeedWarning) {
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 20px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Move Faster!', canvasSize.width / 2, canvasSize.height - 100);
      }

      // Draw bar exit warning
      if (showBarExitWarning) {
        ctx.fillStyle = '#FFA500';
        ctx.font = 'bold 24px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Return to the bar!', canvasSize.width / 2, canvasSize.height - 100);
      }

      // Draw +50 animation
      if (showPlusFifty) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+${GAME_CONFIG.REWARDS.PRACTICE_VALUE}`, canvasSize.width / 2, canvasSize.height / 2 - 100);
      }
    } else if (gamePhase === 'keypress') {
      // Draw coin pile
      if (coinVisible) {
        const pileHeight = drawCoinPile(ctx, GAME_CONFIG.REWARDS.PRACTICE_VALUE, false);
      }

      // Draw key sequence
      if (keySequence.length > 0) {
        const keySpacing = 50;
        const sequenceStartX = coinPosition.x - (keySequence.length * keySpacing) / 2;
        const sequenceY = coinPosition.y + 200;

        ctx.font = 'bold 48px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        keySequence.forEach((key, index) => {
          const keyX = sequenceStartX + (index * keySpacing);

          if (keyStates[index] === 'correct') {
            ctx.fillStyle = '#27ae60';
          } else if (keyStates[index] === 'incorrect') {
            ctx.fillStyle = '#e74c3c';
          } else if (index === currentKeyIndex) {
            ctx.fillStyle = '#f39c12';
          } else {
            ctx.fillStyle = '#7f8c8d';
          }

          ctx.fillText(key.toUpperCase(), keyX, sequenceY);
        });

        // Current key instruction
        if (currentKeyIndex < keySequence.length) {
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 24px "Arial", sans-serif';
          ctx.fillText(`Press: ${keySequence[currentKeyIndex].toUpperCase()}`, coinPosition.x, sequenceY + 50);
        }

        // Progress indicator
        const progressText = `${currentKeyIndex}/${keySequence.length}`;
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '20px "Arial", sans-serif';
        ctx.fillText(progressText, coinPosition.x, sequenceY + 75);
      }

      // Draw score
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${score}`, canvasSize.width / 2, 90);

      // Draw instructions
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Press the highlighted keys in sequence to collect the coin!', canvasSize.width / 2, canvasSize.height - 50);

      // Draw +50 animation
      if (showPlusFifty) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+${GAME_CONFIG.REWARDS.PRACTICE_VALUE}`, canvasSize.width / 2, canvasSize.height / 2 - 100);
      }
    }
  }, [timeLeft, score, gamePhase, coinVisible, canvasSize, showSpeedWarning, showBarExitWarning, showPlusFifty, keySequence, currentKeyIndex, keyStates, cursorPosition, gameActive, leftBarVisible, rightBarVisible]);

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