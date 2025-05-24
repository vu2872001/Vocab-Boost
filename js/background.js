// English Vocabulary Helper - Background Script
// Handles daily word resets, data initialization, and milestone checks

// Constants
const STORAGE_KEYS = {
  LEARNED_WORDS: 'learnedWords',
  DAILY_WORDS: 'dailyWords',
  LAST_UPDATE: 'lastUpdate',
  TOTAL_COUNT: 'totalWordsCount',
  SELECTED_LEVEL: 'selectedLevel'
};

const WORDS_PER_DAY = 5;
const MILESTONE_THRESHOLD = 100;
const DEFAULT_LEVEL = 'easy';

// Initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('English Vocabulary Helper installed');
  
  // Set up initial storage values if they don't exist
  const storage = await chrome.storage.local.get([
    STORAGE_KEYS.LEARNED_WORDS,
    STORAGE_KEYS.DAILY_WORDS,
    STORAGE_KEYS.LAST_UPDATE,
    STORAGE_KEYS.TOTAL_COUNT,
    STORAGE_KEYS.SELECTED_LEVEL
  ]);
  
  if (!storage[STORAGE_KEYS.LEARNED_WORDS]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.LEARNED_WORDS]: [] });
  }
  
  if (!storage[STORAGE_KEYS.TOTAL_COUNT]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.TOTAL_COUNT]: 0 });
  }
  
  if (!storage[STORAGE_KEYS.SELECTED_LEVEL]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_LEVEL]: DEFAULT_LEVEL });
  }
  
  // Set up initial daily words
  await updateDailyWords();
  
  // Set an alarm to check for daily reset
  chrome.alarms.create('dailyReset', { periodInMinutes: 60 }); // Check hourly
});

// Handle the daily reset alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    checkAndResetDaily();
  }
});

// Check if we need to reset the daily words (e.g., it's a new day)
async function checkAndResetDaily() {
  const storage = await chrome.storage.local.get([STORAGE_KEYS.LAST_UPDATE]);
  const lastUpdate = storage[STORAGE_KEYS.LAST_UPDATE];
  
  // If there's no last update timestamp, or it's from a previous day, update daily words
  if (!lastUpdate || isNewDay(new Date(lastUpdate))) {
    await updateDailyWords();
  }
}

// Update the daily words from our vocabulary dataset, ensuring we have enough words for each level
async function updateDailyWords() {
  try {
    const response = await fetch(chrome.runtime.getURL('data/vocabulary.json'));
    const data = await response.json();
    
    if (!data || !data.words || !data.words.length) {
      console.error('No vocabulary data found');
      return;
    }
    
    // Get the full vocabulary and create groups by level
    const allWords = data.words;
    const wordsByLevel = {
      easy: allWords.filter(word => word.level === 'easy'),
      medium: allWords.filter(word => word.level === 'medium'),
      hard: allWords.filter(word => word.level === 'hard')
    };
    
    // Ensure we have at least WORDS_PER_DAY words for each level
    Object.keys(wordsByLevel).forEach(level => {
      if (wordsByLevel[level].length < WORDS_PER_DAY) {
        console.warn(`Not enough ${level} words available. Adding words from other levels.`);
        // Backfill from other levels if needed
        const otherLevels = Object.keys(wordsByLevel).filter(l => l !== level);
        let additionalWords = [];
        
        otherLevels.forEach(otherLevel => {
          if (wordsByLevel[level].length < WORDS_PER_DAY) {
            const neededCount = WORDS_PER_DAY - wordsByLevel[level].length;
            const availableWords = wordsByLevel[otherLevel];
            const wordsToAdd = availableWords.slice(0, neededCount);
            
            additionalWords = [...additionalWords, ...wordsToAdd];
            // Remove these words from their original level to avoid duplicates
            wordsByLevel[otherLevel] = availableWords.slice(neededCount);
          }
        });
        
        wordsByLevel[level] = [...wordsByLevel[level], ...additionalWords];
      }
    });
    
    // Select random words for each level
    const selectedWordsByLevel = {
      easy: getRandomWords(wordsByLevel.easy, WORDS_PER_DAY),
      medium: getRandomWords(wordsByLevel.medium, WORDS_PER_DAY),
      hard: getRandomWords(wordsByLevel.hard, WORDS_PER_DAY)
    };
    
    // Save all selected words to storage with current timestamp
    const now = new Date().toISOString();
    await chrome.storage.local.set({
      [STORAGE_KEYS.DAILY_WORDS]: [
        ...selectedWordsByLevel.easy,
        ...selectedWordsByLevel.medium,
        ...selectedWordsByLevel.hard
      ],
      [STORAGE_KEYS.LAST_UPDATE]: now
    });
    
    console.log(`Daily words updated at ${now}`);
  } catch (error) {
    console.error('Error updating daily words:', error);
  }
}

// Check if the given date is from a different day than today
function isNewDay(date) {
  const today = new Date();
  return date.getDate() !== today.getDate() ||
         date.getMonth() !== today.getMonth() ||
         date.getFullYear() !== today.getFullYear();
}

// Get n random words from an array without repetition
function getRandomWords(wordArray, count) {
  // Make a copy to avoid modifying the original array
  const words = [...wordArray];
  const result = [];
  
  // Ensure we don't try to get more words than available
  count = Math.min(count, words.length);
  
  for (let i = 0; i < count; i++) {
    // Get a random index from the remaining words
    const randomIndex = Math.floor(Math.random() * words.length);
    
    // Add the word to our result and remove it from the pool
    result.push(words[randomIndex]);
    words.splice(randomIndex, 1);
  }
  
  return result;
}

// Handle messaging from popup or other extension components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'wordLearned') {
    handleWordLearned(message.word);
    sendResponse({ success: true });
  } else if (message.action === 'checkMilestone') {
    checkMilestone().then(result => sendResponse(result));
    return true; // Indicates we'll send a response asynchronously
  } else if (message.action === 'settingsChanged') {
    // Handle settings changes that might affect word selection
    updateDailyWords().then(() => sendResponse({ success: true }));
    return true;
  }
});

// Handle when a user marks a word as learned
async function handleWordLearned(word) {
  try {
    // Get current learned words and total count
    const storage = await chrome.storage.local.get([
      STORAGE_KEYS.LEARNED_WORDS,
      STORAGE_KEYS.TOTAL_COUNT
    ]);
    
    const learnedWords = storage[STORAGE_KEYS.LEARNED_WORDS] || [];
    let totalCount = storage[STORAGE_KEYS.TOTAL_COUNT] || 0;
    
    // Check if word is already in learned list to avoid duplicates
    const isAlreadyLearned = learnedWords.some(item => item.word === word.word);
    
    if (!isAlreadyLearned) {
      // Add word to learned list with timestamp and level
      const newLearnedWord = {
        ...word,
        learnedDate: new Date().toISOString()
      };
      
      learnedWords.push(newLearnedWord);
      totalCount++;
      
      // Update storage
      await chrome.storage.local.set({
        [STORAGE_KEYS.LEARNED_WORDS]: learnedWords,
        [STORAGE_KEYS.TOTAL_COUNT]: totalCount
      });
      
      console.log(`Word "${word.word}" (${word.level} level) marked as learned. Total: ${totalCount}`);
      
      // Check if we've hit a milestone
      return checkMilestone();
    }
  } catch (error) {
    console.error('Error handling learned word:', error);
  }
}

// Check if the user has hit a milestone
async function checkMilestone() {
  try {
    const storage = await chrome.storage.local.get([STORAGE_KEYS.TOTAL_COUNT]);
    const totalCount = storage[STORAGE_KEYS.TOTAL_COUNT] || 0;
    
    // Check if total count is a multiple of the milestone threshold
    if (totalCount > 0 && totalCount % MILESTONE_THRESHOLD === 0) {
      return {
        milestone: true,
        count: totalCount
      };
    }
    
    return { milestone: false };
  } catch (error) {
    console.error('Error checking milestone:', error);
    return { milestone: false, error: error.message };
  }
}
