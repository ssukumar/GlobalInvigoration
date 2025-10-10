// Game Configuration File
// Modify these values to change game behavior without editing code

export const GAME_CONFIG = {
  // ===== GAME STRUCTURE =====
  BLOCKS: {
    POOR: {
      baseRounds: 30, // Base number of rounds 
    },
    RICH: {
      baseRounds: 30, // Base number of rounds 
    }
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
    VALUES: [10, 30, 50], // Available reward values (no more 0 reward)
    PRACTICE_VALUE: 50, // Reward value for practice mode
    ARRAYS: {
      POOR: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 30, 30, 30, 30, 30, 30, 30, 30, 30, 50, 50, 50, 50, 50, 50], // 30 rounds for poor environment (50% 10s, 30% 30s, 20% 50s)
      RICH: [10, 10, 10, 10, 10, 10, 30, 30, 30, 30, 30, 30, 30, 30, 30, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]  // 30 rounds for rich environment (20% 10s, 30% 30s, 50% 50s)
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
    return baseRounds * 2;
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
export const getRandomKeySequence = () => {
  const sequences = GAME_CONFIG.KEYS.PREDEFINED_SEQUENCES;
  const randomIndex = Math.floor(Math.random() * sequences.length);
  return sequences[randomIndex];
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

// Cache for reward sequences to ensure consistency
const rewardSequenceCache = {
  poor: null,
  rich: null
};

// Helper function to generate reward sequence based on fixed arrays
export const generateRewardSequence = (environment) => {
  const baseArray = GAME_CONFIG.REWARDS.ARRAYS[environment.toUpperCase()];
  
  // Shuffle the array and return it (array length matches round count)
  return shuffleArray(baseArray);
};

// Helper function to get reward sequence for environment (cached)
export const getRewardSequence = (environment) => {
  // Return cached sequence if it exists
  if (rewardSequenceCache[environment]) {
    return rewardSequenceCache[environment];
  }
  
  // Generate and cache new sequence
  const sequence = generateRewardSequence(environment);
  rewardSequenceCache[environment] = sequence;
  return sequence;
};

// Helper function to reset reward sequence cache (for testing or new sessions)
export const resetRewardSequenceCache = () => {
  rewardSequenceCache.poor = null;
  rewardSequenceCache.rich = null;
};

// Helper function to get total rounds for environment
export const getTotalRounds = (environment) => {
  return calculateTotalRounds(environment);
};

// Helper function to check if round should trigger break
export const shouldTriggerBreak = (environment, round) => {
  if (environment === 'poor' && round >= calculateTotalRounds('poor')) {
    return true;
  }
  return false;
};

// Helper function to check if game should end
export const shouldEndGame = (environment, round) => {
  if (environment === 'rich' && round >= calculateTotalRounds('rich')) {
    return true;
  }
  return false;
};

export default GAME_CONFIG;
