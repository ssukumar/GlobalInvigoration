import React, { useState, useEffect, useRef } from 'react';
import { getRandomRoundDuration, getRandomKeySequence, GAME_CONFIG } from '../config/gameConfig';
import './game/Game.css';

const PracticeMode = ({ onPracticeComplete }) => {
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(8); // Will be set to random duration when practice starts
  const [score, setScore] = useState(0);
  const [lastClicked, setLastClicked] = useState(null);
  const [gamePhase, setGamePhase] = useState('reaching'); // 'reaching' or 'coin'
  const [coinClicks, setCoinClicks] = useState(0);
  const [coinVisible, setCoinVisible] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalCoinsCollected, setTotalCoinsCollected] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showSpeedWarning, setShowSpeedWarning] = useState(false);
  const [showPlusFifty, setShowPlusFifty] = useState(false);
  const canvasRef = useRef(null);
  const gameCompletedRef = useRef(false);
  const lastBarSwitchTime = useRef(null);
  const speedWarningTimeout = useRef(null);

  // Key sequence state
  const [keySequence, setKeySequence] = useState([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [keyStates, setKeyStates] = useState([]); // Track status of each key: 'pending', 'correct', 'incorrect'

  // Cursor position state for custom cursor
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  const totalRounds = 2; // Practice mode only has 2 trials

  // Use config function for random round duration
  const handleRandomRoundDuration = () => {
    return getRandomRoundDuration();
  };

  // Generate key sequence from config
  const generateKeySequence = () => {
    const sequence = getRandomKeySequence();
    const sequenceLength = GAME_CONFIG.KEYS.PRACTICE_SEQUENCE_LENGTH;
    
    setKeySequence(sequence);
    setCurrentKeyIndex(0);
    // Initialize all keys as pending
    setKeyStates(new Array(sequenceLength).fill('pending'));
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

  // Coin position (center of screen, moved up more to center between score and sequence)
  const coinPosition = {
    x: canvasSize.width / 2,
    y: canvasSize.height / 2 - 80
  };

  // Dynamic coin radius based on reward value (practice always uses practice value)
  const getCoinRadius = () => {
    const baseRadius = Math.min(canvasSize.width, canvasSize.height) * 0.12;
    // Practice mode uses the practice reward value, so we'll make it medium-sized
    return baseRadius * 0.85; // Medium coin (85% of base size)
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
        // Mark key as correct
        setKeyStates(prev => {
          const newStates = [...prev];
          newStates[currentKeyIndex] = 'correct';
          return newStates;
        });
        
        setCurrentKeyIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= keySequence.length) {
            // Sequence completed, coin collected
            setScore(prev => prev + GAME_CONFIG.REWARDS.PRACTICE_VALUE);
            setShowPlusFifty(true);
            // Hide +50 animation after 2 seconds
            setTimeout(() => {
              setShowPlusFifty(false);
            }, 2000);
            setTotalCoinsCollected(prev => prev + 1);
            if (currentRound >= totalRounds) {
              // Practice complete - return to instructions
              setGameActive(false);
              setKeySequence([]); // Clear sequence when practice is complete
              setKeyStates([]); // Clear key states
              if (!gameCompletedRef.current) {
                gameCompletedRef.current = true;
                setTimeout(() => {
                  onPracticeComplete();
                }, 2000); // Wait for +20 animation to finish
              }
            } else {
              // Start next round
              setCurrentRound(prev => prev + 1);
              setGamePhase('reaching');
              setTimeLeft(handleRandomRoundDuration());
              setCoinVisible(false);
              setCoinClicks(0);
              setLastClicked(null);
              setKeySequence([]); // Clear sequence for next round
              setKeyStates([]); // Clear key states for next round
            }
            return 0; // Reset for next round
          }
          return nextIndex;
        });
      } else {
        // Mark key as incorrect but don't advance
        setKeyStates(prev => {
          const newStates = [...prev];
          newStates[currentKeyIndex] = 'incorrect';
          return newStates;
        });
        
        // Reset the incorrect key to pending after a brief delay
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
  }, [gameActive, gamePhase, coinVisible, currentRound, totalRounds, score, totalCoinsCollected, onPracticeComplete, keySequence, currentKeyIndex]);

  // Handle mouse movement for bar hover detection
  const handleMouseMove = (event) => {
    if (!gameActive) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Update cursor position for custom cursor drawing
    setCursorPosition({ x, y });

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
    setGamePhase('reaching');
    setTimeLeft(handleRandomRoundDuration()); // Set random duration for first round
  }, []);

  // Cleanup speed warning timeout on unmount
  useEffect(() => {
    return () => {
      if (speedWarningTimeout.current) {
        clearTimeout(speedWarningTimeout.current);
      }
    };
  }, []);

  // Handle cursor visibility based on game phase
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Remove existing cursor classes
    canvas.classList.remove('cursor-visible', 'cursor-hidden');

    if (gamePhase === 'coin') {
      // Hide cursor during reward collection
      canvas.classList.add('cursor-hidden');
    } else {
      // Show yellow circle cursor during reaching phase
      canvas.classList.add('cursor-visible');
    }
  }, [gamePhase]);

  // Set initial cursor class when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Start with visible cursor since practice starts in 'reaching' phase
      canvas.classList.add('cursor-visible');
    }
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

    if (gamePhase === 'reaching') {
      // Always draw bars during reaching phase
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
          ctx.arc(coinPosition.x, coinPosition.y, getCoinRadius(), 0, 2 * Math.PI);
          ctx.fillStyle = '#808080'; // Gray color
          ctx.fill();
          ctx.strokeStyle = '#606060'; // Darker gray border
          ctx.lineWidth = 3;
          ctx.stroke();
          
          // Draw question mark in the center of the circle
          ctx.fillStyle = '#ffffff'; // White text
          ctx.font = `bold ${getCoinRadius() * 0.8}px "Arial", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', coinPosition.x, coinPosition.y);
        }

      // Draw score (centered, bigger)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${score}`, canvasSize.width / 2, 80);

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

      // Draw +50 animation if active
      if (showPlusFifty) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+${GAME_CONFIG.REWARDS.PRACTICE_VALUE}`, canvasSize.width / 2, canvasSize.height / 2 - 100);
      }
    } else if (gamePhase === 'coin') {
      // No bars drawn during coin phase - participant focuses only on coin

      // Draw coin
      if (coinVisible) {
                        // Draw practice coin pile (50 points = 10 coins)
        const drawPracticeCoinPile = (centerX, centerY) => {
          const coinRadius = 20; // All coins are the same size
          const numCoins = 10;
          const baseWidth = 4;
          
          // Calculate spacing for slight overlap
          const spacing = coinRadius * 1.8;
          
          // Draw coins in pyramid formation
          let coinIndex = 0;
          for (let row = 0; row < baseWidth; row++) {
            const coinsInRow = row + 1;
            const rowY = centerY + (row * spacing * 0.8);
            const rowStartX = centerX - ((coinsInRow - 1) * spacing) / 2;
            
            for (let col = 0; col < coinsInRow && coinIndex < numCoins; col++) {
              const coinX = rowStartX + (col * spacing);
              
              // Draw single coin
              ctx.beginPath();
              ctx.arc(coinX, rowY, coinRadius, 0, 2 * Math.PI);
              
              // Create uniform gold gradient
              const gradient = ctx.createRadialGradient(
                coinX - coinRadius * 0.3,
                rowY - coinRadius * 0.3,
                0,
                coinX,
                rowY,
                coinRadius
              );
              gradient.addColorStop(0, '#FFD700'); // Bright gold center
              gradient.addColorStop(0.7, '#FFA500'); // Orange gold mid
              gradient.addColorStop(1, '#FF8C00'); // Dark orange edge
              
              ctx.fillStyle = gradient;
              ctx.fill();
              
              // Coin border
              ctx.strokeStyle = '#FF8C00'; // Dark orange border
              ctx.lineWidth = 2;
              ctx.stroke();

              // Simple dark vertical bar in the middle
              ctx.fillStyle = '#B8860B'; // Dark gold bar
              ctx.fillRect(
                coinX - coinRadius * 0.1,
                rowY - coinRadius * 0.4,
                coinRadius * 0.2,
                coinRadius * 0.8
              );
              
              coinIndex++;
            }
          }
        };
        
        // Draw the practice coin pile
        drawPracticeCoinPile(coinPosition.x, coinPosition.y);
        
        // Draw the reward value below the coin pile in gold text
        ctx.fillStyle = '#FFD700'; // Gold text
        ctx.font = 'bold 24px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Practice pile height (10 coins = 4 rows = 80px height)
        const pileHeight = 80;
        ctx.fillText('50 points', coinPosition.x, coinPosition.y + pileHeight + 30);
      }

      // Draw key sequence display
      if (keySequence.length > 0) {
        // Key sequence display - show all 10 keys in a row
        const keySpacing = 45;
        const sequenceStartX = coinPosition.x - (keySequence.length * keySpacing) / 2;
        // Position below the practice coin pile (pile height = 80) - moved lower for better spacing
        const sequenceY = coinPosition.y + 80 + 120;
        
        ctx.font = 'bold 36px "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        keySequence.forEach((key, index) => {
          const keyX = sequenceStartX + (index * keySpacing);
          
          // Determine color based on key state
          if (keyStates[index] === 'correct') {
            ctx.fillStyle = '#27ae60'; // Green
          } else if (keyStates[index] === 'incorrect') {
            ctx.fillStyle = '#e74c3c'; // Red
          } else if (index === currentKeyIndex) {
            ctx.fillStyle = '#f39c12'; // Orange for current key
          } else {
            ctx.fillStyle = '#7f8c8d'; // Grey for pending
          }
          
          ctx.fillText(key.toUpperCase(), keyX, sequenceY);
        });
        
        // Show current key instruction below the sequence
        if (currentKeyIndex < keySequence.length) {
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 24px "Arial", sans-serif';
          ctx.fillText(`Press: ${keySequence[currentKeyIndex].toUpperCase()}`, coinPosition.x, sequenceY + 40);
        }
        
        // Progress indicator
        const progressText = `${currentKeyIndex}/${keySequence.length}`;
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '20px "Arial", sans-serif';
        ctx.fillText(progressText, coinPosition.x, sequenceY + 65);
      }

      // Draw score (centered, bigger)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${score}`, canvasSize.width / 2, 80);

      // Draw instructions
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P", "Courier New", monospace';
      ctx.textAlign = 'center';
      if (keySequence.length > 0) {
        ctx.fillText('Press the highlighted keys in sequence to collect the coin!', canvasSize.width / 2, canvasSize.height - 50);
      } else {
        ctx.fillText('Get ready to follow the key sequence!', canvasSize.width / 2, canvasSize.height - 50);
      }

      // Draw +50 animation if active
      if (showPlusFifty) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+${GAME_CONFIG.REWARDS.PRACTICE_VALUE}`, canvasSize.width / 2, canvasSize.height / 2 - 100);
      }

      // Draw custom cursor (only during reaching phase)
      if (gamePhase === 'reaching' && gameActive) {
        // Draw yellow circle cursor
        ctx.beginPath();
        ctx.arc(cursorPosition.x, cursorPosition.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFD700'; // Bright yellow
        ctx.fill();
        ctx.strokeStyle = '#FFA500'; // Orange border
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

  }, [timeLeft, score, lastClicked, gamePhase, coinVisible, coinClicks, currentRound, totalRounds, canvasSize, showSpeedWarning, showPlusFifty, keySequence, currentKeyIndex, keyStates, cursorPosition, gameActive]);

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