import React, { useState, useEffect, useRef } from 'react';
import { RawMovementTracker, RewardTracker, saveSessionData } from '../firebase/dataCollection';
import './game/Game.css';

const Game = ({ participantData, participantId, onGameComplete }) => {
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
  const rawMovementTracker = useRef(null);
  const rewardTracker = useRef(null);
  const [trialData, setTrialData] = useState([]);

  // Generate random round duration (8, 10, or 12 seconds)
  const getRandomRoundDuration = () => {
    const durations = [8, 10, 12];
    return durations[Math.floor(Math.random() * durations.length)];
  };

  // Generate random key sequence
  const generateKeySequence = () => {
    const keys = ['a', 's', 'd', 'f']; 
    const sequence = [];
    const sequenceLength = 10; // Always 10 keys (keeping this for key sequence length)
    
    for (let i = 0; i < sequenceLength; i++) {
      sequence.push(keys[Math.floor(Math.random() * keys.length)]);
    }
    
    setKeySequence(sequence);
    setCurrentKeyIndex(0);
    // Initialize all keys as pending
    setKeyStates(new Array(sequenceLength).fill('pending'));
  };

    // Handle continue from break to rich environment
  const handleContinueToRich = () => {
    setCurrentEnvironment('rich');
    setEnvironmentRound(1); // Explicitly reset to 1 for rich environment
    setGamePhase('reaching');
    setTimeLeft(getRandomRoundDuration());
    setGameActive(true);
    setCoinVisible(false);
    setKeySequence([]);
    setKeyStates([]);
    setCurrentRewardValue(0); // Reset reward value
    
    // Reset movement tracking for new environment
    if (rawMovementTracker.current && rawMovementTracker.current.isTracking) {
      rawMovementTracker.current.stopTracking();
    }
    
    // Use existing tracker instead of creating a new one
    if (rawMovementTracker.current) {
      rawMovementTracker.current.startTracking({
        environment: 'rich',
        environmentRound: 1, // Use environmentRound instead of round for consistency
        participantId: participantId
      });
    }
    

  };

  // Bar dimensions and positions - calculated reactively based on canvasSize
  const barWidth = Math.max(canvasSize.width * 0.1, 100); // Minimum 100px width
  const barHeight = Math.max(canvasSize.height, 600); // Minimum 600px height

  // Bar positions (left and right edges)
  const leftBar = {
    x: 0,
    y: 0,
    width: barWidth,
    height: barHeight
  };
  const rightBar = {
    x: Math.max(canvasSize.width - barWidth, barWidth), // Ensure right bar doesn't overlap left
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

  // Timer for circle phase
  useEffect(() => {
    if (gameActive && gamePhase === 'reaching') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Only transition if we're in a valid environment (not break) and game is still active
            if (currentEnvironment === 'break' || !gameActive) {
              return 0; // Stop timer but don't transition
            }
            
            setGamePhase('coin');
            setCoinVisible(true);
            
    let rewardValue = 0;
    
    if (currentEnvironment === 'poor') {
      // Poor environment: specific reward sequence [10, 10, 0, 10, 10, 0, 10, 50, 10, 10]
      const poorRewards = [10, 10, 0, 10, 10, 0, 10, 50, 10, 10];
      // Map rounds (1,3,5,7,9,11,13,15,17,19) to indices (0,1,2,3,4,5,6,7,8,9)
      const rewardIndex = Math.floor((environmentRound - 1) / 2);
      rewardValue = poorRewards[rewardIndex];
    } else if (currentEnvironment === 'rich') {
      // Rich environment: specific reward sequence [50, 100, 50, 100, 10, 50, 100, 50, 100, 50]
      const richRewards = [50, 100, 50, 100, 10, 50, 100, 50, 100, 50, 0];
      // Map rounds (1,3,5,7,9,11,13,15,17,19) to indices (0,1,2,3,4,5,6,7,8,9)
      const rewardIndex = Math.floor((environmentRound - 1) / 2);
      rewardValue = richRewards[rewardIndex];
    }
            

            
            setCurrentRewardValue(rewardValue);
            
            // Initialize tracking based on input method
            if (inputMethod === 'key') {
              generateKeySequence(); // Generate new sequence for this round
            }
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameActive, gamePhase]); // Remove environmentRound from dependencies to prevent double triggering

  // Start raw movement tracking when reaching phase begins
  // This collects high-frequency x, y, time data for research analysis
  // No real-time calculations - just pure data collection
  useEffect(() => {
    if (gamePhase === 'reaching' && rawMovementTracker.current) {
      // Calculate expected reward for logging (10 rounds per environment)
      let logReward = 0;
      if (currentEnvironment === 'poor') {
        // Poor environment: specific reward sequence [10, 10, 0, 10, 10, 0, 10, 50, 10, 10]
        const poorRewards = [10, 10, 0, 10, 10, 0, 10, 50, 10, 10];
        // Map rounds (1,3,5,7,9,11,13,15,17,19) to indices (0,1,2,3,4,5,6,7,8,9)
        const rewardIndex = Math.floor((environmentRound - 1) / 2);
        logReward = poorRewards[rewardIndex];
      } else if (currentEnvironment === 'rich') {
        // Rich environment: specific reward sequence [50, 100, 50, 100, 10, 50, 100, 50, 100, 50]
        const richRewards = [50, 100, 50, 100, 10, 50, 100, 50, 100, 50];
        // Map rounds (1,3,5,7,9,11,13,15,17,19) to indices (0,1,2,3,4,5,6,7,8,9)
        const rewardIndex = Math.floor((environmentRound - 1) / 2);
        logReward = richRewards[rewardIndex];
      }
      
      console.log('Starting raw movement tracking for trial:', {
        environment: currentEnvironment,
        environmentRound: environmentRound,
        expectedReward: logReward,
        isTracking: rawMovementTracker.current.isTracking
      });
      
      // Use reward calculation for tracking (10 rounds per environment)
      let expectedReward = 0;
      if (currentEnvironment === 'poor') {
        if (environmentRound <= 5) {
          expectedReward = environmentRound % 2 === 1 ? 10 : 50;
        } else {
          expectedReward = environmentRound % 2 === 1 ? 25 : 75;
        }
      } else if (currentEnvironment === 'rich') {
        if (environmentRound <= 5) {
          expectedReward = Math.max(100 - (environmentRound - 1) * 15, 25);
        } else {
          expectedReward = Math.max(75 - (environmentRound - 6) * 10, 15);
        }
      }
      
      const trialInfo = {
        environment: currentEnvironment,
        environmentRound: environmentRound,
        expectedReward: expectedReward
      };
      // Start tracking with bar positions for context
      rawMovementTracker.current.startTracking(trialInfo, { 
        left: leftBar, 
        right: rightBar 
      });
      console.log('Raw movement tracking started successfully');
    }
  }, [gamePhase, currentEnvironment, environmentRound, leftBar, rightBar]);

  // Start reward tracking when key sequence is generated
  useEffect(() => {
    if (gamePhase === 'coin' && keySequence.length > 0 && rewardTracker.current) {
      console.log('Starting reward tracking for sequence:', keySequence);
      
      // Use reward calculation for tracking (19 rounds per environment)
      let expectedReward = 0;
      if (currentEnvironment === 'poor') {
        // Poor environment: specific reward sequence [10, 10, 0, 10, 10, 0, 10, 50, 10, 10]
        const poorRewards = [10, 10, 0, 10, 10, 0, 10, 50, 10, 10];
        // Map rounds (1,3,5,7,9,11,13,15,17,19) to indices (0,1,2,3,4,5,6,7,8,9)
        const rewardIndex = Math.floor((environmentRound - 1) / 2);
        expectedReward = poorRewards[rewardIndex];
      } else if (currentEnvironment === 'rich') {
        // Rich environment: specific reward sequence [50, 100, 50, 100, 10, 50, 100, 50, 100, 50]
        const richRewards = [50, 100, 50, 100, 10, 50, 100, 50, 100, 50];
        // Map rounds (1,3,5,7,9,11,13,15,17,19) to indices (0,1,2,3,4,5,6,7,8,9)
        const rewardIndex = Math.floor((environmentRound - 1) / 2);
        expectedReward = richRewards[rewardIndex];
      }
      
      const trialInfo = {
        environment: currentEnvironment,
        environmentRound: environmentRound,
        expectedReward: expectedReward
      };
      rewardTracker.current.startTracking(trialInfo, keySequence);
      console.log('Reward tracking started successfully');
    }
  }, [keySequence, gamePhase, currentEnvironment, environmentRound]);

  // Handle keyboard input for coin interaction and break screen
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Handle break screen
      if (gamePhase === 'break' && event.key === ' ') {
        handleContinueToRich();
        return;
      }
      
      // Key sequence implementation for reward collection
      
      if (!gameActive || gamePhase !== 'coin' || !coinVisible || keySequence.length === 0) return;
      
      const pressedKey = event.key.toLowerCase();
      const expectedKey = keySequence[currentKeyIndex];
      
              // Record key press for reward tracking
        const isCorrect = pressedKey === expectedKey;
        if (rewardTracker.current) {
          rewardTracker.current.recordKeyPress(pressedKey, isCorrect);
        }
      
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
            const rewardPoints = currentRewardValue || 0; // Ensure it's a number
            setScore(prev => (prev || 0) + rewardPoints);
            
            // Show reward animation
            if (rewardPoints > 0) {
              setRewardAnimationText(`+${rewardPoints}`);
              setShowRewardAnimation(true);
              setTimeout(() => {
                setShowRewardAnimation(false);
              }, 2000);
            }
            
            setTotalCoinsCollected(prev => prev + 1);
            
                        // Modified trial data collection to include movement data
            if (rewardTracker.current) {
              const rewardData = rewardTracker.current.stopTracking();
              
              // Get movement data if available
              let movementData = null;
              if (rawMovementTracker.current && rawMovementTracker.current.isTracking) {
                movementData = rawMovementTracker.current.stopTracking();
              }
              
                            // Create comprehensive trial data with all collected information
              const completeTrialData = {
                participantId: participantId,
                environment: currentEnvironment,
                environmentRound: environmentRound,
                totalRound: (currentEnvironment === 'poor' ? environmentRound : environmentRound + 2),
                expectedReward: currentRewardValue || 0,
                actualReward: rewardPoints || 0,
                
                // Raw movement data (reaching phase) - simplified for research
                rawMovementData: movementData || {
                  participantId: participantId,
                  trialInfo: {
                    environment: currentEnvironment,
                    environmentRound: environmentRound,
                    expectedReward: currentRewardValue || 0
                  },
                  startTime: Date.now() - 8000, // Approximate trial duration
                  endTime: Date.now(),
                  duration: 8000,
                  screenDimensions: { width: window.innerWidth, height: window.innerHeight },
                  barPositions: { left: leftBar, right: rightBar },
                  rawMovements: [], // Empty if no movement data
                  totalMovements: 0,
                  samplingRate: 0
                  // All analysis metrics removed - will be calculated post-game from raw data
                },
                
                // Reward data (key pressing phase)
                rewardData: rewardData || {
                  participantId: participantId,
                  trialInfo: {
                    environment: currentEnvironment,
                    environmentRound: environmentRound,
                    expectedReward: currentRewardValue || 0
                  },
                  startTime: Date.now() - 5000, // Approximate key press duration
                  endTime: Date.now(),
                  duration: 5000,
                  expectedSequence: keySequence || [],
                  keyPresses: [], // Empty if no key press data
                  totalPresses: 0,
                  correctPresses: 0,
                  accuracy: 0,
                  overshoot: 0,
                  averageInterKeyInterval: 0,
                  completionTime: null
                },
                
                score: (score || 0) + (rewardPoints || 0),
                timestamp: new Date().toISOString()
              };
              
              // Clean the data to remove any undefined values
              const cleanTrialData = JSON.parse(JSON.stringify(completeTrialData));
              
              setTrialData(prev => [...prev, cleanTrialData]);
              
              // Reset trackers for next trial (don't recreate, just reset state)
              if (rawMovementTracker.current) {
                rawMovementTracker.current.stopTracking();
              }
              if (rewardTracker.current) {
                rewardTracker.current.stopTracking();
              }
            }
            
            // GAME PROGRESSION: 10 rounds per environment (rounds 1,2,3,4,5,6,7,8,9,10)
            const totalTrialsCompleted = trialData.length;
            
            // After 19 poor rounds (round 19), switch to break
            if (currentEnvironment === 'poor' && environmentRound >= 19) {
              setCurrentEnvironment('break');
              setGamePhase('break');
              setCoinVisible(false);
              setKeySequence([]);
              setKeyStates([]);
              return nextIndex;
            }
            
            // After 19 rich rounds (round 19), end game
            if (currentEnvironment === 'rich' && environmentRound >= 21) {
              setGameActive(false);
              setCoinVisible(false);
              setKeySequence([]);
              setKeyStates([]);
              if (!gameCompletedRef.current) {
                gameCompletedRef.current = true;
                onGameComplete?.();
              }
              return nextIndex;
            }
            
            // Continue to next round in current environment
            // SIMPLE WORKAROUND: Just increment environmentRound
            // Increment by 1 (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)
            setEnvironmentRound(prev => prev + 1);
            generateKeySequence();
            setGamePhase('reaching');
            setTimeLeft(getRandomRoundDuration());
            setGameActive(true);
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
  }, [gameActive, gamePhase, coinVisible, keySequence, currentKeyIndex, keyStates, currentEnvironment, currentRewardValue, participantId, participantData, sessionStartTime, trialData, onGameComplete]);

  // Enable RawMovementTracker initialization
  useEffect(() => {
    // Trackers are now initialized in startGame function
    // This effect is kept for any future initialization needs
    

  }, [participantId]);

  // Start movement tracking when reaching phase begins
  useEffect(() => {
    if (gamePhase === 'reaching' && rawMovementTracker.current && !rawMovementTracker.current.isTracking) {
      // Calculate expected reward using 19-round logic
      let expectedReward = 0;
      if (currentEnvironment === 'poor') {
        // Poor environment: specific reward sequence [10, 10, 0, 10, 10, 0, 10, 50, 10, 10]
        const poorRewards = [10, 10, 0, 10, 10, 0, 10, 50, 10, 10];
        // Map rounds (1,3,5,7,9,11,13,15,17,19) to indices (0,1,2,3,4,5,6,7,8,9)
        const rewardIndex = Math.floor((environmentRound - 1) / 2);
        expectedReward = poorRewards[rewardIndex];
      } else if (currentEnvironment === 'rich') {
        // Rich environment: specific reward sequence [50, 100, 50, 100, 10, 50, 100, 50, 100, 50]
        const richRewards = [50, 100, 50, 100, 10, 50, 100, 50, 100, 50];
        // Map rounds (1,3,5,7,9,11,13,15,17,19) to indices (0,1,2,3,4,5,6,7,8,9)
        const rewardIndex = Math.floor((environmentRound - 1) / 2);
        expectedReward = richRewards[rewardIndex];
      }
      
      const trialInfo = {
        environment: currentEnvironment,
        environmentRound: environmentRound,
        expectedReward: expectedReward
      };
      // Start tracking with bar positions for context
      rawMovementTracker.current.startTracking(trialInfo, { 
        left: leftBar, 
        right: rightBar 
      });
    }
  }, [gamePhase, currentEnvironment, environmentRound, leftBar, rightBar]);

  // Handle mouse movement for bar hover detection
  const handleMouseMove = (event) => {
    if (!gameActive || gamePhase !== 'reaching') return; // Only track during reaching phase

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Record movement data during reaching phase
    let currentBar = null;
    if (x >= leftBar.x && x <= leftBar.x + leftBar.width &&
        y >= leftBar.y && y <= leftBar.y + leftBar.height) {
      currentBar = 'left';
    } else if (x >= rightBar.x && x <= rightBar.x + rightBar.width &&
               y >= rightBar.y && y <= rightBar.y + rightBar.height) {
      currentBar = 'right';
    }
    
    // Add debugging for movement tracking
    if (rawMovementTracker.current && rawMovementTracker.current.isTracking) {
      rawMovementTracker.current.recordMovement(x, y, currentBar);
    }

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

    // Game start function
  const startGame = () => {
    setGameActive(true);
    setGamePhase('reaching');
    setTimeLeft(getRandomRoundDuration());
    setEnvironmentRound(1);
    setCurrentEnvironment('poor');
    setScore(0);
    setTotalCoinsCollected(0);

    
    // Initialize trackers with fallback
    if (participantId) {
      rawMovementTracker.current = new RawMovementTracker(participantId);
      rewardTracker.current = new RewardTracker(participantId);
    } else {
      // Create trackers with a temporary ID if none available
      const tempId = 'temp_' + Date.now();
      rawMovementTracker.current = new RawMovementTracker(tempId);
      rewardTracker.current = new RewardTracker(tempId);
    }
    
  };

  // Initialize game when component mounts
  useEffect(() => {
    // Wait a bit for participantId to be available if it's not yet set
    if (!participantId) {
      const timer = setTimeout(() => {
        startGame();
      }, 100);
      return () => clearTimeout(timer);
    }
    
    startGame();
  }, [participantId]); // Now depends on participantId

  // Cleanup on unmount
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
    if (!canvas) {
      console.error('Canvas ref is null!');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context!');
      return;
    }

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Add debugging info
    console.log('RENDERING:', {
      gamePhase: gamePhase,
      gameActive: gameActive,
      currentEnvironment: currentEnvironment,
      environmentRound: environmentRound,
      coinVisible: coinVisible
    });

    if (gamePhase === 'reaching') {
      try {
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
        
        console.log('Bars drawn successfully');
      } catch (error) {
        console.error('Error drawing bars:', error);
      }

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

      // Draw reward animation if active
      if (showRewardAnimation) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(rewardAnimationText, canvasSize.width / 2, canvasSize.height / 2 - 100);
      }
    } else if (gamePhase === 'coin') {
      // No bars drawn during coin phase - participant focuses only on coin

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
          
          // Display "0" curved around top of coin like US currency
          const text = '0';
          const fontSize = coinRadius * 0.4;
          ctx.font = `bold ${fontSize}px "Arial", sans-serif`;
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
          // Coin with different colors based on reward value
          let colors, borderColor, barColor;
          
          if (currentRewardValue === 10) {
            // Bronze coin
            colors = {
              center: '#CD7F32',
              mid: '#B8722C', 
              edge: '#A0621E'
            };
            borderColor = '#8B5A1F';
            barColor = '#654321';
          } else if (currentRewardValue === 50) {
            // Silver coin
            colors = {
              center: '#C0C0C0',
              mid: '#A8A8A8',
              edge: '#909090'
            };
            borderColor = '#777777';
            barColor = '#555555';
          } else {
            // Gold coin (100 points or default)
            colors = {
              center: '#FFD700',
              mid: '#FFA500',
              edge: '#FF8C00'
            };
            borderColor = '#B8860B';
            barColor = '#8B4513';
          }
          
        // Main coin body with gradient
        const gradient = ctx.createRadialGradient(
          coinPosition.x - coinRadius * 0.3, 
          coinPosition.y - coinRadius * 0.3, 
          0,
          coinPosition.x, 
          coinPosition.y, 
          coinRadius
        );
          gradient.addColorStop(0, colors.center);
          gradient.addColorStop(0.7, colors.mid);
          gradient.addColorStop(1, colors.edge);
        
        ctx.beginPath();
        ctx.arc(coinPosition.x, coinPosition.y, coinRadius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Coin border
          ctx.strokeStyle = borderColor;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Simple dark vertical bar in the middle
          ctx.fillStyle = barColor;
        ctx.fillRect(
          coinPosition.x - coinRadius * 0.1, 
          coinPosition.y - coinRadius * 0.4, 
          coinRadius * 0.2, 
          coinRadius * 0.8
        );
        
        // Border around the vertical bar
          ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          coinPosition.x - coinRadius * 0.1, 
          coinPosition.y - coinRadius * 0.4, 
          coinRadius * 0.2, 
          coinRadius * 0.8
        );
          
          // Display reward value curved around top of coin like US currency
          const text = (currentRewardValue || 0).toString(); // Add fallback to 0
          const fontSize = coinRadius * 0.4;
          ctx.font = `bold ${fontSize}px "Arial", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          if (text.length === 1) {
            // For single digit, place at top center
            const charX = coinPosition.x;
            const charY = coinPosition.y - coinRadius * 0.7;
            
            // Draw shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillText(text, charX + 1, charY + 1);
            
            // Draw main character
            ctx.fillStyle = barColor;
            ctx.fillText(text, charX, charY);
          } else {
            // For multi-digit numbers, curve around the top
            const textRadius = coinRadius * 0.7; // Distance from center to text
            // Adjust angle spread based on number of characters
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
              ctx.fillStyle = barColor;
              ctx.fillText(text[i], 0, 0);
              
              ctx.restore();
            }
          }
        }
      }

      // Draw input method display based on current mode
      if (keySequence.length > 0) {
        // Key sequence display - show all 10 keys in a row
        const keySpacing = 45;
        const sequenceStartX = coinPosition.x - (keySequence.length * keySpacing) / 2;
        const sequenceY = coinPosition.y + coinRadius + 80;
        
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
          ctx.fillText(`Press: ${keySequence[currentKeyIndex].toUpperCase()}`, coinPosition.x, sequenceY + 60);
        }
        
        // Progress indicator
        const progressText = `${currentKeyIndex}/${keySequence.length}`;
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '20px "Arial", sans-serif';
        ctx.fillText(progressText, coinPosition.x, sequenceY + 90);
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

      // Draw reward animation if active
      if (showRewardAnimation) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(rewardAnimationText, canvasSize.width / 2, canvasSize.height / 2 - 100);
      }
    } else if (gamePhase === 'break') {
      // Break screen between environments
      console.log('Rendering break screen');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      
      // Block completed message
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Block 1 Complete!', canvasSize.width / 2, canvasSize.height / 2 - 100);
      
      ctx.font = '20px "Orbitron", "Courier New", monospace';
      ctx.fillText('Take a short break.', canvasSize.width / 2, canvasSize.height / 2 - 40);
      ctx.fillText('Press SPACE to continue to Block 2', canvasSize.width / 2, canvasSize.height / 2 + 40);
      
      // Show current score
      ctx.font = 'bold 24px "Orbitron", "Courier New", monospace';
      ctx.fillText(`Current Score: ${score}`, canvasSize.width / 2, canvasSize.height / 2 + 100);
    } else {
      
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 24px "Arial", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`DEBUG: Invalid game state`, canvasSize.width / 2, canvasSize.height / 2 - 50);
      ctx.fillText(`gamePhase: ${gamePhase}`, canvasSize.width / 2, canvasSize.height / 2);
      ctx.fillText(`gameActive: ${gameActive}`, canvasSize.width / 2, canvasSize.height / 2 + 50);
      ctx.fillText(`environment: ${currentEnvironment}`, canvasSize.width / 2, canvasSize.height / 2 + 100);
    }
  }, [timeLeft, score, lastClicked, gamePhase, coinVisible, canvasSize, 
      showSpeedWarning, showRewardAnimation, keySequence, currentKeyIndex, keyStates, currentEnvironment, 
      currentRewardValue, rewardAnimationText, gameActive, environmentRound]);

  // Handle game completion when rich environment ends
  useEffect(() => {
    // End after rich environment reaches round 19 (19 rounds completed)
    if (currentEnvironment === 'rich' && environmentRound >= 21 && !gameCompletedRef.current) {
              console.log('RICH ENVIRONMENT COMPLETE - ENDING GAME (round 21 reached)');
      console.log(' Current trial data:', trialData);
      console.log('Trial data length:', trialData.length);
      
      setGameActive(false);
      setCoinVisible(false);
      setKeySequence([]);
      setKeyStates([]);
      gameCompletedRef.current = true;
      
      // Save final session data
      const comprehensiveSessionData = {
        // Session metadata
        participantId: participantId,
        participantData: participantData,
        sessionStartTime: sessionStartTime,
        sessionEndTime: Date.now(),
        sessionDuration: Date.now() - sessionStartTime,
        completedAt: new Date().toISOString(),
        
        // Game summary
        totalScore: score,
        totalCoinsCollected: totalCoinsCollected,
        
        // ALL trial data in one place
        allTrials: trialData,
        
        // Summary statistics
        summary: {
          totalTrials: trialData.length,
          poorEnvironmentTrials: trialData.filter(t => t.environment === 'poor').length,
          richEnvironmentTrials: trialData.filter(t => t.environment === 'rich').length,
          totalKeyPresses: trialData.reduce((sum, trial) => 
            sum + (trial.rewardData?.totalPresses || 0), 0),
          totalCorrectPresses: trialData.reduce((sum, trial) => 
            sum + (trial.rewardData?.correctPresses || 0), 0),
          overallAccuracy: (() => {
            const totalPresses = trialData.reduce((sum, trial) => sum + (trial.rewardData?.totalPresses || 0), 0);
            const correctPresses = trialData.reduce((sum, trial) => sum + (trial.rewardData?.correctPresses || 0), 0);
            return totalPresses > 0 ? correctPresses / totalPresses : 0;
          })(),
          averageReactionTime: (() => {
            const avgTimes = trialData.map(trial => trial.rewardData?.averageInterKeyInterval || 0).filter(t => t > 0);
            return avgTimes.length > 0 ? avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length : 0;
          })()
        }
      };
      
      console.log('About to save comprehensive session data:', comprehensiveSessionData);
      
      // Clean the data to remove any undefined values
      const cleanSessionData = JSON.parse(JSON.stringify(comprehensiveSessionData));
      
      // Add detailed console output for final data
      console.log('FINAL SESSION DATA BREAKDOWN:');
              console.log('Participant Info:', cleanSessionData.participantData);
              console.log('Session Summary:', {
        totalTrials: cleanSessionData.summary.totalTrials,
        poorTrials: cleanSessionData.summary.poorEnvironmentTrials,
        richTrials: cleanSessionData.summary.richEnvironmentTrials,
        totalScore: cleanSessionData.totalScore,
        totalCoinsCollected: cleanSessionData.totalCoinsCollected
      });
      
      // Fix the trials access - use allTrials instead of trials
              console.log('All Trials:', cleanSessionData.allTrials);
              console.log('Poor Environment Trials:', cleanSessionData.allTrials.filter(t => t.environment === 'poor'));
      console.log('Rich Environment Trials:', cleanSessionData.allTrials.filter(t => t.environment === 'rich'));
      
      // Add error checking for environment summaries
      if (cleanSessionData.environmentSummaries) {
        console.log(' Environment Summaries:', {
          poor: cleanSessionData.environmentSummaries.poor,
          rich: cleanSessionData.environmentSummaries.rich
        });
      } else {
        console.log('Environment summaries not available');
      }
      
      console.log('Overall Summary:', cleanSessionData.summary);
      
      // Save as ONE comprehensive file
      saveSessionData(cleanSessionData).then(() => {
        console.log('Session data saved, calling onGameComplete');
        onGameComplete?.(cleanSessionData);
      }).catch((error) => {
        console.error('Failed to save session data:', error);
        // Still call onGameComplete even if save fails
        onGameComplete?.(cleanSessionData);
      });
    }
  }, [currentEnvironment, environmentRound, gameCompletedRef, participantId, participantData, sessionStartTime, score, totalCoinsCollected, trialData, onGameComplete]);

  // Debug state changes
  useEffect(() => {
    console.log('State changed:', {
      currentEnvironment,
      environmentRound,
      gamePhase,
      gameActive,
      trialDataLength: trialData.length
    });
  }, [currentEnvironment, environmentRound, gamePhase, gameActive, trialData.length]);

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

export default Game; 