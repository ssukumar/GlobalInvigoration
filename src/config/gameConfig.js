// Game Configuration File
// Modify these values to change game behavior without editing code

export const GAME_CONFIG = {
  // ===== GAME STRUCTURE =====
  BLOCKS: {
    POOR: {
      baseRounds: 5, // Base number of rounds 
      // num_blocks: 2 // Number of blocks of type poor
    },
    RICH: {
      baseRounds: 5, // Base number of rounds 
      // num_blocks: 2 // Number of blocks of type rich
    },
    ORDER: ['poor', 'rich', 'rich', 'poor'] // Order of environments
  },

  // ===== ROUND DURATIONS =====
  ROUND_DURATIONS: {
    REACHING_PHASE: {
      mean: 20, // Mean duration in seconds
      standardDeviation: 2, // Standard deviation in seconds
      min: 15, // Minimum duration (to avoid too short rounds)
      max: 25  // Maximum duration (to avoid too long rounds)
    },
    REWARD_CUE_TIME: 3, // Seconds before reward collection when gray circle appears
    WARNING_THRESHOLD: 2 // Seconds remaining when speed warning appears
  },

  // ===== REWARD VALUES =====
  REWARDS: {
    VALUES: [10, 60, 100], // Available reward values (no more 0 reward)
    PRACTICE_VALUE: 30, // Reward value for practice mode
    ARRAYS: {
      POOR: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 60, 60, 60, 60, 60, 60, 60, 60, 60, 100, 100, 100, 100, 100, 100], // 30 rounds for poor environment (50% 10s, 30% 30s, 20% 50s)
      RICH: [10, 10, 10, 10, 10, 10, 60, 60, 60, 60, 60, 60, 60, 60, 60, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]  // 30 rounds for rich environment (20% 10s, 30% 30s, 50% 50s)
    }
  },

  // ===== KEY SEQUENCES =====
  KEYS: {
    VALID_KEYS: ['a', 's', 'd', 'f'], // Valid keys for reward collection
    SEQUENCE_LENGTH: 10, // Number of keys to press in sequence
    PRACTICE_SEQUENCE_LENGTH: 10, // Number of keys for practice mode
    PREDEFINED_SEQUENCES: [
      ['a', 's', 'd', 'f', 'a', 's', 'd', 'f', 'a', 's'], // Sequence 1
      ['f', 'd', 's', 'a', 'f', 'd', 's', 'a', 'f', 'd'], // Sequence 2
      ['s', 'a', 'f', 'd', 's', 'a', 'f', 'd', 's', 'a'], // Sequence 3
      ['d', 'f', 'a', 's', 'd', 'f', 'a', 's', 'd', 'f'], // Sequence 4
      ['a', 'f', 's', 'd', 'a', 'f', 's', 'd', 'a', 'f'], // Sequence 5
      ['f', 's', 'd', 'a', 'f', 's', 'd', 'a', 'f', 's']  // Sequence 6
    ]
  },

  // ===== MOVEMENT TRACKING =====
  TRACKING: {
    SAMPLE_RATE: 16, // Milliseconds between movement samples (~60fps)
    WALL_THRESHOLD: 50, // Pixels from wall edge to be considered "at wall"
    REACH_DEFINITION: 'wall_to_wall' // How to define a reach: 'wall_to_wall' or 'distance_based'
  }
};

// Helper function to calculate total rounds based on base rounds
export const calculateTotalRounds = (environment) => {
  const baseRounds = environment === 'poor' ? GAME_CONFIG.BLOCKS.POOR.baseRounds : GAME_CONFIG.BLOCKS.RICH.baseRounds;
  
  if (environment === 'poor') {
    // Poor environment: baseRounds 
    return baseRounds;
  } else {
    // Rich environment: baseRounds 
    return baseRounds;
  }
};

// Helper function to get random round duration with normal distribution
export const getRandomRoundDuration = () => {
  const config = GAME_CONFIG.ROUND_DURATIONS.REACHING_PHASE;
  
  // Box-Muller transform to generate normally distributed random numbers
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // Apply mean and standard deviation
  let duration = config.mean + z0 * config.standardDeviation;
  
  // Clamp to min/max bounds
  duration = Math.max(config.min, Math.min(config.max, duration));
  
  // Round to nearest 0.1 seconds for practical use
  return Math.round(duration * 10) / 10;
};

// Helper function to get random key sequence from predefined options
// export const getRandomKeySequence = () => {
//   const sequences = GAME_CONFIG.KEYS.PREDEFINED_SEQUENCES;
//   const randomIndex = Math.floor(Math.random() * sequences.length);
//   return sequences[randomIndex];
// };

// Generate a random key sequence of specified length from VALID_KEYS
// Uses without-replacement sampling: cycles through keys, reshuffling when exhausted.
// Guarantees no immediate consecutive repeats and balanced key distribution.
export const getRandomKeySequence = () => {
  const validKeys = GAME_CONFIG.KEYS.VALID_KEYS.slice(); // ['a','s','d','f']
  const length = GAME_CONFIG.KEYS.SEQUENCE_LENGTH || 10;
  const sequence = [];
  let availableKeys = shuffleArray(validKeys); // Start with shuffled keys
  let keyIndex = 0;

  for (let i = 0; i < length; i++) {
    // If we've exhausted the current pool, reshuffle for the next cycle
    if (keyIndex >= availableKeys.length) {
      availableKeys = shuffleArray(validKeys);
      keyIndex = 0;
    }

    const currentKey = availableKeys[keyIndex];

    // Avoid adjacent repeats: if this key matches the previous key, try to swap
    if (i > 0 && currentKey === sequence[i - 1]) {
      // Find next key in pool that's different from the previous key
      let swapped = false;
      for (let j = keyIndex + 1; j < availableKeys.length; j++) {
        if (availableKeys[j] !== sequence[i - 1]) {
          // Swap and pick the different key
          [availableKeys[keyIndex], availableKeys[j]] = [availableKeys[j], availableKeys[keyIndex]];
          swapped = true;
          break;
        }
      }

      // If no swap found in current pool, move to next pool
      if (!swapped) {
        availableKeys = shuffleArray(validKeys);
        keyIndex = 0;
        // Recurse to pick from fresh pool (avoiding infinite loop via length check)
        if (validKeys.length > 1 && availableKeys[keyIndex] === sequence[i - 1]) {
          // Move to next key in fresh pool if first key is same as prev
          keyIndex = 1;
        }
      }
    }

    sequence.push(availableKeys[keyIndex]);
    keyIndex++;
  }

  return sequence;
};

// Helper function to shuffle an array (Fisher-Yates algorithm)
export const shuffleArray = (array) => {
  const shuffled = [...array]; // Create a copy to avoid mutating original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ===== BLOCK ORDER SUPPORT =====
// Cache for reward sequences keyed by block index (supports repeated environments in ORDER)
const rewardSequenceCache = {};

// Helper function to generate reward sequence based on fixed arrays
export const generateRewardSequence = (environment) => {
  const baseArray = GAME_CONFIG.REWARDS.ARRAYS[environment.toUpperCase()];
  if (!baseArray) {
    console.warn(`Unknown environment: ${environment}, defaulting to POOR rewards`);
    return shuffleArray(GAME_CONFIG.REWARDS.ARRAYS.POOR);
  }
  
  // Shuffle the array and return it (array length matches round count)
  return shuffleArray(baseArray);
};

// Helper function to get reward sequence for environment (cached by environment name)
export const getRewardSequence = (environment) => {
  // Return cached sequence if it exists
  if (rewardSequenceCache[`env_${environment}`]) {
    return rewardSequenceCache[`env_${environment}`];
  }
  
  // Generate and cache new sequence
  const sequence = generateRewardSequence(environment);
  rewardSequenceCache[`env_${environment}`] = sequence;
  return sequence;
};

// Helper function to get reward sequence for a specific block index (supports repeated environments)
export const getRewardSequenceForBlock = (blockIndex) => {
  const environment = getBlockEnvironment(blockIndex);
  if (!environment) {
    console.warn(`Invalid block index: ${blockIndex}`);
    return generateRewardSequence('poor');
  }
  
  // Cache by block index to support distinct sequences for repeated environment entries
  const cacheKey = `block_${blockIndex}`;
  if (rewardSequenceCache[cacheKey]) {
    return rewardSequenceCache[cacheKey];
  }
  
  const sequence = generateRewardSequence(environment);
  rewardSequenceCache[cacheKey] = sequence;
  return sequence;
};

// Helper function to reset reward sequence cache (for testing or new sessions)
export const resetRewardSequenceCache = () => {
  Object.keys(rewardSequenceCache).forEach(key => {
    delete rewardSequenceCache[key];
  });
};

// ===== BLOCK SEQUENCING HELPERS =====
// Export the ORDER array for easy access
export const BLOCK_ORDER = GAME_CONFIG.BLOCKS.ORDER;

// Get environment name for a given block index
export const getBlockEnvironment = (blockIndex) => {
  if (blockIndex < 0 || blockIndex >= BLOCK_ORDER.length) {
    return null;
  }
  return BLOCK_ORDER[blockIndex];
};

// Get the number of rounds for a specific block index
export const getBlockRounds = (blockIndex) => {
  const environment = getBlockEnvironment(blockIndex);
  if (!environment) {
    console.warn(`Invalid block index: ${blockIndex}`);
    return 0;
  }
  return calculateTotalRounds(environment);
};

// Get the next block index (or null if at the end)
export const getNextBlockIndex = (blockIndex) => {
  const nextIndex = blockIndex + 1;
  return nextIndex < BLOCK_ORDER.length ? nextIndex : null;
};

// Get the environment of the next block (or null if no next block)
export const getNextBlockEnvironment = (blockIndex) => {
  const nextIndex = getNextBlockIndex(blockIndex);
  return nextIndex !== null ? getBlockEnvironment(nextIndex) : null;
};

// Determine the transition state for the current block and round
export const getBlockTransition = (blockIndex, round) => {
  const blockRounds = getBlockRounds(blockIndex);
  
  if (round <= blockRounds) {
    return 'continue';
  } else if (getNextBlockIndex(blockIndex) !== null) {
    return 'break';
  } else {
    return 'end';
  }
};

// Helper function to get total rounds for environment (backward compatibility)
export const getTotalRounds = (environment) => {
  return calculateTotalRounds(environment);
};

// Helper function to check if round should trigger break (backward compatibility - now based on block)
export const shouldTriggerBreak = (blockIndex, round) => {
  return getBlockTransition(blockIndex, round) === 'break';
};

// Helper function to check if game should end (backward compatibility - now based on block)
export const shouldEndGame = (blockIndex, round) => {
  return getBlockTransition(blockIndex, round) === 'end';
};

export default GAME_CONFIG;
