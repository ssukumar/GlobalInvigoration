import React, { useState, useEffect, useRef } from 'react';
import { saveParticipantTrial } from '../firebase/dataCollection';
import { getRandomRoundDuration, getRandomKeySequence, GAME_CONFIG, getRewardSequence } from '../config/gameConfig';
import './game/Game.css';

const Game2 = ({ participantData, participantId, onGameComplete }) => {
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(8); // Will be set to random duration when game starts
  const [score, setScore] = useState(0);
  const [lastClicked, setLastClicked] = useState(null);
  const [gamePhase, setGamePhase] = useState('reaching'); // 'reaching' or 'coin'
  const [coinVisible, setCoinVisible] = useState(false);
  const [totalCoinsCollected, setTotalCoinsCollected] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showSpeedWarning, setShowSpeedWarning] = useState(false);
  const canvasRef = useRef(null);
  const gameCompletedRef = useRef(false);
  const speedWarningTimeout = useRef(null);
  const lastBarSwitchTime = useRef(Date.now());

  // Key sequence state
  const [keySequence, setKeySequence] = useState([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [keyStates, setKeyStates] = useState([]); // Track status of each key: 'pending', 'correct', 'incorrect'

  // Reward environment state
  const [currentEnvironment, setCurrentEnvironment] = useState('poor'); // 'poor', 'break', or 'rich'
  const [environmentRound, setEnvironmentRound] = useState(1); // Round within current environment
  const [currentRewardValue, setCurrentRewardValue] = useState(0);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [rewardAnimationText, setRewardAnimationText] = useState('');

  // Input method state
  const [inputMethod] = useState('key'); // Always use keyboard input for reward collection

  // Data collection state
  const [sessionStartTime] = useState(Date.now());
  
  // New synchronized data arrays for each reach
  const [gameStateArray, setGameStateArray] = useState([]);
  const [eventArray, setEventArray] = useState([]);
  const [posXArray, setPosXArray] = useState([]);
  const [posYArray, setPosYArray] = useState([]);
  const [startWall, setStartWall] = useState(null);
  const [endWall, setEndWall] = useState(null);
  const [keytapNumberArray, setKeytapNumberArray] = useState([]);
  const [keytapValueArray, setKeytapValueArray] = useState([]);
  const [timestampArray, setTimestampArray] = useState([]);
  const [keyupTimestampArray, setKeyupTimestampArray] = useState([]);
  const [validityArray, setValidityArray] = useState([]);
  const [currentReachNumber, setCurrentReachNumber] = useState(1);
  const [lastWallPosition, setLastWallPosition] = useState(null);
  const [currentKeytapNumber, setCurrentKeytapNumber] = useState(1);
  
  // Refs for tracking event states
  const rewardCueActiveRef = useRef(false);
  const rewardCollectionActiveRef = useRef(false);

  // Utility helpers to normalize array lengths
  const padToLength = (arr, targetLength, fillValue = null) => {
    const out = Array.isArray(arr) ? arr.slice(0, targetLength) : [];
    while (out.length < targetLength) out.push(fillValue);
    return out;
  };

  const makeArray = (value, length) => Array.from({ length }, () => value);

  // Helper function to append reaching data to all arrays simultaneously
  const appendReachingData = (x, y, timestamp) => {
    // Determine game state based on x position relative to bar boundaries
    let gameState;
    let currentWall;
    const { leftBar, rightBar } = getBarPositions();
    const leftBarRightEdge = leftBar.x + leftBar.width;
    const rightBarLeftEdge = rightBar.x;
    
    if (x >= leftBar.x && x <= leftBarRightEdge) {
      gameState = 'ASW'; // At Source Wall (left bar)
      currentWall = 'L';
    } else if (x >= rightBarLeftEdge && x <= rightBar.x + rightBar.width) {
      gameState = 'ATW'; // At Target Wall (right bar)
      currentWall = 'R';
    } else {
      // Check if warning is active - if so, show Warning State instead of Reach Ongoing
      // Note: Warning State (WS) and Reach Ongoing (RO) are mutually exclusive
      if (showSpeedWarning) {
        gameState = 'WS'; // Warning State - "move faster" warning is displayed
      } else {
        gameState = 'RO'; // Reach Ongoing - normal movement between bars
      }
      currentWall = 'N'; // Neither wall
    }
    
    // Wall-to-wall reach counting logic
    if (lastWallPosition && lastWallPosition !== currentWall && currentWall !== 'N') {
      // We've moved from one wall to another wall (not to neutral)
      const newReachNumber = currentReachNumber + 1;
      setCurrentReachNumber(newReachNumber);
      
      // Set the end wall for the completed reach
      setEndWall(currentWall);
      
      // Save the completed reach data
      saveReachData(
        newReachNumber - 1,
        currentWall,
        startWall,
        {
          gameStateArray: gameStateArray.slice(),
          eventArray: eventArray.slice(),
          posXArray: posXArray.slice(),
          posYArray: posYArray.slice(),
          timestampArray: timestampArray.slice()
        }
      ); // Save the reach that just completed with explicit values
      
      // Reset arrays for the new reach
      setGameStateArray([]);
      setEventArray([]);
      setPosXArray([]);
      setPosYArray([]);
      setStartWall(currentWall); // New reach starts from this wall
      setEndWall(null);
      setKeytapNumberArray([]);
      setKeytapValueArray([]);
      setTimestampArray([]);
      setKeyupTimestampArray([]);
      setValidityArray([]);
      // Keep a monotonically increasing reach counter within the round
      setCurrentReachNumber(newReachNumber);
      setCurrentKeytapNumber(1);
    }
    
    // Update last wall position for next comparison
    setLastWallPosition(currentWall);
    
    // Append data to all synchronized arrays
    setGameStateArray(prev => [...prev, gameState]);
    setEventArray(prev => [...prev, 'movement']);
    setPosXArray(prev => [...prev, x]);
    setPosYArray(prev => [...prev, y]);
    setTimestampArray(prev => [...prev, timestamp]);
    
    // Set start wall on first movement if not set
    if (!startWall && currentWall !== 'N') {
      setStartWall(currentWall);
    }
  };

  // Helper function to save reach data (pass values explicitly to avoid async state lag)
  const saveReachData = async (
    reachNumber,
    reachedEndWall,
    reachedStartWall,
    arrays
  ) => {
    if (!arrays || arrays.gameStateArray.length === 0) return;

    // Normalize movement arrays to same length
    const movementLen = Math.max(
      arrays.gameStateArray?.length || 0,
      arrays.eventArray?.length || 0,
      arrays.posXArray?.length || 0,
      arrays.posYArray?.length || 0,
      arrays.timestampArray?.length || 0
    );

    const gameStateArrayN = padToLength(arrays.gameStateArray, movementLen, null);
    const eventArrayN = padToLength(arrays.eventArray, movementLen, 'movement');
    const posXArrayN = padToLength(arrays.posXArray, movementLen, null);
    const posYArrayN = padToLength(arrays.posYArray, movementLen, null);
    const timestampArrayN = padToLength(arrays.timestampArray, movementLen, null);

    // Key placeholder arrays must match movement length
    const keytapNumberArrayN = makeArray(null, movementLen);
    const keytapValueArrayN = makeArray(null, movementLen);
    const keyupTimestampArrayN = makeArray(null, movementLen);
    const validityArrayN = makeArray(null, movementLen);

    const reachData = {
      participantId,
      sessionStartTime,
      reachNumber,
      environment: currentEnvironment,
      environmentRound,
      round: environmentRound,
      block: currentEnvironment === 'poor' ? 1 : 2,
      startWall: reachedStartWall,
      endWall: reachedEndWall,
      gameStateArray: gameStateArrayN,
      eventArray: eventArrayN,
      posXArray: posXArrayN,
      posYArray: posYArrayN,
      timestampArray: timestampArrayN,
      keytapNumberArray: keytapNumberArrayN,
      keytapValueArray: keytapValueArrayN,
      keyupTimestampArray: keyupTimestampArrayN,
      validityArray: validityArrayN,
      totalPresses: null,
      currScore: score,
      coinValue: null,
      completedAt: new Date().toISOString()
    };

    try {
      const blockNumber = currentEnvironment === 'poor' ? 1 : 2;
      const docId = `${participantId}_block${blockNumber}_round${environmentRound}_reach${reachNumber}`;
      await saveParticipantTrial(participantId, reachData, docId);
      console.log(`Reach ${reachNumber} data saved successfully`);
    } catch (error) {
      console.error(`Failed to save reach ${reachNumber} data:`, error);
    }
  };

  // Helper function to save round data (key presses)
  const saveRoundData = async () => {
    if (keytapNumberArray.length === 0) return;

    // Normalize key arrays to same length
    const keyLen = Math.max(
      keytapNumberArray.length,
      keytapValueArray.length,
      timestampArray.length,
      keyupTimestampArray.length,
      validityArray.length
    );

    const keytapNumberArrayN = padToLength(keytapNumberArray, keyLen, null);
    const keytapValueArrayN = padToLength(keytapValueArray, keyLen, null);
    const timestampArrayN = padToLength(timestampArray, keyLen, null);
    const keyupTimestampArrayN = padToLength(keyupTimestampArray, keyLen, null);
    const validityArrayN = padToLength(validityArray, keyLen, null);

    // Reaching placeholder arrays must match key length
    const gameStateArrayN = makeArray(null, keyLen);
    const eventArrayN = makeArray(null, keyLen);
    const posXArrayN = makeArray(null, keyLen);
    const posYArrayN = makeArray(null, keyLen);
    const reachTimestampArrayN = makeArray(null, keyLen);

    const roundData = {
      participantId,
      sessionStartTime,
      environment: currentEnvironment,
      environmentRound,
      round: environmentRound,
      block: currentEnvironment === 'poor' ? 1 : 2,
      rewardValue: currentRewardValue,
      coinValue: currentRewardValue,
      keytapNumberArray: keytapNumberArrayN,
      keytapValueArray: keytapValueArrayN,
      timestampArray: timestampArrayN,
      keyupTimestampArray: keyupTimestampArrayN,
      validityArray: validityArrayN,
      totalPresses: keyLen,
      gameStateArray: gameStateArrayN,
      eventArray: eventArrayN,
      posXArray: posXArrayN,
      posYArray: posYArrayN,
      reachTimestampArray: reachTimestampArrayN,
      startWall: null,
      endWall: null,
      reachNumber: null,
      currScore: score,
      completedAt: new Date().toISOString()
    };

    try {
      const blockNumber = currentEnvironment === 'poor' ? 1 : 2;
      const docId = `${participantId}_block${blockNumber}_round${environmentRound}`;
      await saveParticipantTrial(participantId, roundData, docId);
      console.log(`Round ${environmentRound} data saved successfully`);
    } catch (error) {
      console.error(`Failed to save round ${environmentRound} data:`, error);
    }
  };

  // Bar dimensions and positions - match PracticeMode logic
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
    x: Math.max(canvasSize.width / 2, 400), // Minimum 400px from left
    y: Math.max(canvasSize.height / 2 - 60, 200) // Minimum 200px from top
  };

  const coinRadius = Math.max(Math.min(canvasSize.width, canvasSize.height) * 0.12, 30); // Minimum 30px radius

  // Provide current positions for consumers (e.g., reaching logic)
  const getBarPositions = () => {
    return {
      leftBar,
      rightBar,
      coinPosition,
      coinRadius
    };
  };

  // Coin pile drawing function - copied from PracticeMode
  const drawCoinPile = (ctx, rewardValue) => {
    if (rewardValue === 0) {
      // No reward - blank circle
      ctx.beginPath();
      ctx.arc(coinPosition.x, coinPosition.y, coinRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#f0f0f0'; // Light gray
      ctx.fill();
      ctx.strokeStyle = '#c0c0c0'; // Darker gray border
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Display "0" at the top
      ctx.fillStyle = '#888888';
      ctx.font = `bold ${coinRadius * 0.4}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('0', coinPosition.x, coinPosition.y - coinRadius * 0.7);
      return 0;
    }
    
    let numCoins, baseWidth;
    if (rewardValue === 10) {
      numCoins = 1;
      baseWidth = 1;
    } else if (rewardValue === 30) {
      numCoins = 3;
      baseWidth = 2;
    } else if (rewardValue === 50) {
      numCoins = 10;
      baseWidth = 4;
    } else {
      return 0;
    }
    
    const coinRadius = 20; // All coins are the same size
    const spacing = coinRadius * 1.8; // Slight overlap
    
    // Draw coins in pyramid formation
    let coinIndex = 0;
    for (let row = 0; row < baseWidth; row++) {
      const coinsInRow = row + 1;
      const rowY = coinPosition.y + (row * spacing * 0.8);
      const rowStartX = coinPosition.x - ((coinsInRow - 1) * spacing) / 2;
      
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
    
    // Calculate pile height for positioning
    const pileHeight = baseWidth * spacing * 0.8;
    
    // Draw reward value below the coin pile in gold text
    ctx.fillStyle = '#FFD700'; // Gold text
    ctx.font = 'bold 24px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${rewardValue} points`, coinPosition.x, coinPosition.y + pileHeight + 30);
    
    return pileHeight;
  };

  // Handle window resize
  useEffect(() => {
        const handleResize = () => {
      const newSize = { width: window.innerWidth, height: window.innerHeight };
      setCanvasSize(newSize);
    };
    
    // Set initial size
    const initialSize = { width: window.innerWidth, height: window.innerHeight };
    setCanvasSize(initialSize);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle key press during reward collection
  const handleKeyPress = (event) => {
    if (!gameActive || gamePhase !== 'coin' || !coinVisible) return;
    
    const key = event.key.toLowerCase();
    const validKeys = ['a', 's', 'd', 'f'];
    
    if (!validKeys.includes(key)) return;
    
    // Add safety check for keySequence
    if (keySequence.length === 0 || currentKeyIndex >= keySequence.length) return;
    
    const timestamp = Date.now();
    const expectedKey = keySequence[currentKeyIndex];
    const isValid = key === expectedKey;
    
    // Update key states
    const newKeyStates = [...keyStates];
    newKeyStates[currentKeyIndex] = isValid ? 'correct' : 'incorrect';
    setKeyStates(newKeyStates);
    
    // Record key press data
    setKeytapNumberArray(prev => [...prev, currentKeyIndex + 1]);
    setKeytapValueArray(prev => [...prev, currentRewardValue]);
    setTimestampArray(prev => [...prev, timestamp]);
    setValidityArray(prev => [...prev, isValid ? 'correct' : 'incorrect']);
    
    if (isValid) {
      // Correct key pressed
      // Score is awarded only after completing the entire sequence
      
      // Move to next key
      const nextIndex = currentKeyIndex + 1;
      if (nextIndex < keySequence.length) {
        setCurrentKeyIndex(nextIndex);
      } else {
        // Round completed
        // Award points once at the end of the sequence
        setScore(prev => prev + currentRewardValue);
        setTotalCoinsCollected(prev => prev + 1);
        setShowRewardAnimation(true);
        setRewardAnimationText(`+${currentRewardValue}!`);
        setTimeout(() => {
          setShowRewardAnimation(false);
      }, 1000);

        // Reset bar highlight state for next reaching phase
        setLastClicked(null);

        // Ensure speed warning is cleared after reward collection
        setShowSpeedWarning(false);
        if (speedWarningTimeout.current) {
          clearTimeout(speedWarningTimeout.current);
        }

        setGamePhase('reaching');
        setCoinVisible(false);
        setCurrentKeyIndex(0);
        setKeyStates(new Array(keySequence.length).fill('pending'));
        
        // Save round data
        saveRoundData();
        
        // Move to next round
        const nextRound = environmentRound + 1;
        setEnvironmentRound(nextRound);
        
        if (currentEnvironment === 'poor' && nextRound > GAME_CONFIG.BLOCKS.POOR.baseRounds * 2 - 1) {
          // Switch to break
          setGamePhase('break');
        } else if (currentEnvironment === 'rich' && nextRound > GAME_CONFIG.BLOCKS.RICH.baseRounds * 2 + 1) {
          // Game completed
          setGameActive(false);
          gameCompletedRef.current = true;
        } else {
          // Continue with next round
          const roundDuration = getRandomRoundDuration(currentEnvironment);
          const sequence = getRandomKeySequence();
          
          setTimeLeft(roundDuration);
          setKeySequence(sequence);
          setKeyStates(new Array(sequence.length).fill('pending'));
        }
      }
    } else {
      // Incorrect key pressed
      setShowRewardAnimation(true);
      setRewardAnimationText('Wrong key!');
      
      setTimeout(() => {
        setShowRewardAnimation(false);
      }, 1000);
    }
  };

  // Handle key up for timing
  const handleKeyUp = (event) => {
    if (!gameActive || gamePhase !== 'coin' || !coinVisible) return;
    
    const key = event.key.toLowerCase();
    const validKeys = ['a', 's', 'd', 'f'];
    
    if (!validKeys.includes(key)) return;
    
    // Add safety check for keySequence
    if (keySequence.length === 0 || currentKeyIndex >= keySequence.length) return;
    
    const timestamp = Date.now();
    setKeyupTimestampArray(prev => [...prev, timestamp]);
  };

  // Timer effect
  useEffect(() => {
    if (!gameActive || gamePhase !== 'reaching') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up, show reward
          setGamePhase('coin');
          setCoinVisible(true);
          
          // Get reward value from sequence
          const rewardSequence = getRewardSequence(currentEnvironment);
          const rewardIndex = (environmentRound - 1) % rewardSequence.length;
          const rewardValue = rewardSequence[rewardIndex];
          
          setCurrentRewardValue(rewardValue);
          
          // Reset key sequence state
          setCurrentKeyIndex(0);
          setKeyStates(new Array(keySequence.length).fill('pending'));
          
          // Reset key press arrays for new round
          setKeytapNumberArray([]);
          setKeytapValueArray([]);
          setTimestampArray([]);
          setKeyupTimestampArray([]);
          setValidityArray([]);
          setCurrentKeytapNumber(1);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameActive, gamePhase, environmentRound, currentEnvironment, keySequence.length]);

  // Start reward tracking when key sequence is generated - copied from working Game2.jsx
  useEffect(() => {
    if (gamePhase === 'coin' && keySequence.length > 0) {
      console.log('Starting reward tracking for sequence:', keySequence);
      
      const trialInfo = {
                environment: currentEnvironment,
                environmentRound: environmentRound,
        expectedReward: currentRewardValue
      };
      console.log('Reward tracking started successfully');
    }
  }, [keySequence, gamePhase, currentEnvironment, environmentRound, currentRewardValue]);

  // Add event listeners
  useEffect(() => {
    if (gameActive) {
      window.addEventListener('keydown', handleKeyPress);
      window.addEventListener('keyup', handleKeyUp);
    }
    
    // Always listen for space key during break
    if (gamePhase === 'break') {
      const handleBreakKeyPress = (event) => {
        if (event.key === ' ') {
          handleContinueToRich();
        }
      };
      
      window.addEventListener('keydown', handleBreakKeyPress);
      return () => window.removeEventListener('keydown', handleBreakKeyPress);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameActive, gamePhase, coinVisible, keySequence, currentKeyIndex, keyStates, currentEnvironment, currentRewardValue, participantId, participantData, sessionStartTime, onGameComplete]);

  // Reset data collection arrays when starting new trial
  useEffect(() => {
    if (gamePhase === 'reaching') {
      // Reset all synchronized arrays for new round
      setGameStateArray([]);
      setEventArray([]);
      setPosXArray([]);
      setPosYArray([]);
      setStartWall(null);
      setEndWall(null);
      setKeytapNumberArray([]);
      setKeytapValueArray([]);
      setTimestampArray([]);
      setKeyupTimestampArray([]);
      setValidityArray([]);

      setCurrentReachNumber(1);
      setLastWallPosition(null);
      setCurrentKeytapNumber(1);
      
      // Reset event state refs
      rewardCueActiveRef.current = false;
      rewardCollectionActiveRef.current = false;
      
      console.log('Data collection arrays reset for new trial');
    }
  }, [gamePhase, currentEnvironment, environmentRound, currentRewardValue]);

  // Handle key up events for reward tracking
  useEffect(() => {
    const handleKeyUp = (event) => {
      if (!gameActive || gamePhase !== 'coin' || !coinVisible || keySequence.length === 0) return;
      
      const releasedKey = event.key.toLowerCase();
      // Key up tracking removed - using synchronized arrays instead
    };

    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [gameActive, gamePhase, coinVisible, keySequence]);

  // Handle mouse movement for bar hover detection - copied from working Game2.jsx
  const handleMouseMove = (event) => {
    if (!gameActive || gamePhase !== 'reaching') return; // Only track during reaching phase

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Current bar positions
    const { leftBar, rightBar } = getBarPositions();

    // Record movement data during reaching phase using synchronized arrays
    const timestamp = Date.now();
    appendReachingData(x, y, timestamp);

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
        // Set warning to appear after 2 seconds on this bar - copied from working Game2.jsx
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
        // Set warning to appear after 2 seconds on this bar - copied from working Game2.jsx
        speedWarningTimeout.current = setTimeout(() => {
          setShowSpeedWarning(true);
        }, 2000);
      }
    }
  };

  // Start game
  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setEnvironmentRound(1);
    setCurrentEnvironment('poor');
    setGamePhase('reaching');
    setCoinVisible(false);
    setLastClicked(null);
    setShowSpeedWarning(false);
    gameCompletedRef.current = false;
    
    // Reset data collection arrays
    setGameStateArray([]);
    setEventArray([]);
    setPosXArray([]);
    setPosYArray([]);
    setStartWall(null);
    setEndWall(null);
    setKeytapNumberArray([]);
    setKeytapValueArray([]);
    setTimestampArray([]);
    setKeyupTimestampArray([]);
    setValidityArray([]);
    setCurrentReachNumber(1);
    setLastWallPosition(null);
    setCurrentKeytapNumber(1);
    
    // Get random round duration and key sequence
    const roundDuration = getRandomRoundDuration('poor');
    const sequence = getRandomKeySequence();
    
    setTimeLeft(roundDuration);
    setKeySequence(sequence);
    setKeyStates(new Array(sequence.length).fill('pending'));
    
    console.log('Game started with:', { roundDuration, sequence });
  };

  // Initialize game when component mounts - copied from working Game2.jsx
  useEffect(() => {
    // Wait a bit for participantId to be available if it's not yet set
    if (!participantId) {
      const timer = setTimeout(() => {
        startGame();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      startGame();
    }
  }, [participantId]);
    
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
      // Start with visible cursor since game starts in 'reaching' phase
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
      // Draw bars during reaching phase
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
        ctx.font = `bold ${coinRadius * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', coinPosition.x, coinPosition.y);
      }

      // Draw score (centered, bigger)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${score}`, canvasSize.width / 2, 80);



      // Draw speed warning if active
      if (showSpeedWarning) {
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 20px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Move Faster!', canvasSize.width / 2, canvasSize.height - 100);
      }

      // Draw reward animation if active
      if (showRewardAnimation) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(rewardAnimationText, canvasSize.width / 2, canvasSize.height / 2 - 100);
      }
    } else if (gamePhase === 'coin') {
      // No bars drawn during coin phase - participant focuses only on coin

      // Draw score (centered, bigger) - same as reaching phase
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${score}`, canvasSize.width / 2, 80);

      // Draw coin/reward based on reward value
      if (coinVisible) {
        if (currentRewardValue === 0) {
          // No reward - blank circle
          ctx.beginPath();
          ctx.arc(coinPosition.x, coinPosition.y, coinRadius, 0, 2 * Math.PI);
          ctx.fillStyle = '#f0f0f0'; // Light gray
          ctx.fill();
          ctx.strokeStyle = '#c0c0c0'; // Darker gray border
          ctx.lineWidth = 4;
          ctx.stroke();
          
          // Display "0" at the top
          const text = '0';
          const fontSize = coinRadius * 0.4;
          ctx.font = `bold ${fontSize}px "Orbitron", "Courier New", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // For single character, just place it at the top
          const charX = coinPosition.x;
          const charY = coinPosition.y - coinRadius * 0.7;
          
          // Draw shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Lighter shadow for gray coin
          ctx.fillText(text, charX + 1, charY + 1);
          
          // Draw main character
          ctx.fillStyle = '#888888'; // Medium gray
          ctx.fillText(text, charX, charY);
        } else {
          // Use coin pile system from PracticeMode
          const pileHeight = drawCoinPile(ctx, currentRewardValue);
          
          // Draw key sequence below coin pile
          if (keySequence.length > 0) {
            const sequenceStartX = coinPosition.x - (keySequence.length * 40) / 2;
            // Adjust sequence position based on reward value - lower for smaller rewards
            let sequenceY;
          if (currentRewardValue === 10) {
              sequenceY = coinPosition.y + pileHeight + 120; // Lower for 10 points
          } else {
              sequenceY = coinPosition.y + pileHeight + 80; // Standard position for 30/50 points
            }
        
        keySequence.forEach((key, index) => {
              const keyX = sequenceStartX + (index * 40);
          
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
          
              ctx.font = 'bold 36px "Arial", sans-serif';
          ctx.fillText(key.toUpperCase(), keyX, sequenceY);
        });
        
            // Draw "Press:" text
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 24px "Arial", sans-serif';
            ctx.textAlign = 'center';
            if (keySequence.length > 0 && currentKeyIndex < keySequence.length) {
              ctx.fillText(`Press: ${keySequence[currentKeyIndex].toUpperCase()}`, coinPosition.x, sequenceY + 40);
        }
        
            // Draw progress text
        const progressText = `${currentKeyIndex}/${keySequence.length}`;
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '20px "Arial", sans-serif';
      ctx.textAlign = 'center';
            ctx.fillText(progressText, coinPosition.x, sequenceY + 65);
          }
        }
      }
    } else if (gamePhase === 'break') {
      // Break screen between environments
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      
      // Draw score (centered, bigger) - same as other phases
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${score}`, canvasSize.width / 2, 80);
      
      // Block completed message
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Block 1 Complete!', canvasSize.width / 2, canvasSize.height / 2 - 100);
      
      ctx.font = '20px "Orbitron", "Courier New", monospace';
      ctx.fillText('Take a short break.', canvasSize.width / 2, canvasSize.height / 2 - 40);
      ctx.fillText('Press SPACE to continue to Block 2', canvasSize.width / 2, canvasSize.height / 2 + 40);
      
      // Show current score
      ctx.font = 'bold 24px "Orbitron", "Courier New", monospace';
      ctx.fillText(`Current Score: ${score}`, canvasSize.width / 2, canvasSize.height / 2 + 100);
    }
  }, [timeLeft, score, lastClicked, gamePhase, coinVisible, canvasSize, 
      showSpeedWarning, showRewardAnimation, keySequence, currentKeyIndex, keyStates, currentEnvironment, 
      currentRewardValue, rewardAnimationText, gameActive, environmentRound, leftBar, rightBar, coinPosition, coinRadius, barWidth]);

  // Handle game completion when rich environment ends
  useEffect(() => {
    // End after rich environment reaches the configured number of rounds
    const richRounds = GAME_CONFIG.BLOCKS.RICH.baseRounds * 2 + 1;
    if (currentEnvironment === 'rich' && environmentRound >= richRounds && !gameCompletedRef.current) {
      console.log(`RICH ENVIRONMENT COMPLETE - ENDING GAME (round ${richRounds} reached)`);
      
      setGameActive(false);
      setCoinVisible(false);
      setKeySequence([]);
      setKeyStates([]);
      gameCompletedRef.current = true;
      
      // Call onGameComplete without saving session data
      onGameComplete?.();
    }
  }, [currentEnvironment, environmentRound, gameCompletedRef, onGameComplete]);

  // Debug state changes
  useEffect(() => {
    console.log('State changed:', {
      currentEnvironment,
      environmentRound,
      gamePhase,
      gameActive
    });
  }, [currentEnvironment, environmentRound, gamePhase, gameActive]);

  // Handle environment switch
  const handleContinueToRich = () => {
    setCurrentEnvironment('rich');
    setEnvironmentRound(1);
    setGamePhase('reaching');
    setCoinVisible(false);
    setLastClicked(null);
    setShowSpeedWarning(false);
    
    // Reset data collection arrays for new environment
    setGameStateArray([]);
    setEventArray([]);
    setPosXArray([]);
    setPosYArray([]);
    setStartWall(null);
    setEndWall(null);
    setKeytapNumberArray([]);
    setKeytapValueArray([]);
    setTimestampArray([]);
    setKeyupTimestampArray([]);
    setValidityArray([]);
    setCurrentReachNumber(1);
    setLastWallPosition(null);
    setCurrentKeytapNumber(1);
    
    // Get random round duration and key sequence for rich environment
    const roundDuration = getRandomRoundDuration('rich');
    const sequence = getRandomKeySequence();
    
    setTimeLeft(roundDuration);
    setKeySequence(sequence);
    setKeyStates(new Array(sequence.length).fill('pending'));
    
    console.log('Switched to rich environment:', { roundDuration, sequence });
  };

  return (
    <div className="game-container">
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseMove={handleMouseMove}
          className="game-canvas"
          style={{ 
            width: '100vw', 
            height: '100vh', 
            display: 'block',
            backgroundColor: '#000000' // Fallback background
          }}
        />
      </div>
    </div>
  );
};

export default Game2; 