// English Vocabulary Helper - Options Script
// Handles settings and options for the extension

// Storage keys (must match those in background.js)
const STORAGE_KEYS = {
  LEARNED_WORDS: 'learnedWords',
  DAILY_WORDS: 'dailyWords',
  LAST_UPDATE: 'lastUpdate',
  TOTAL_COUNT: 'totalWordsCount',
  SETTINGS: 'userSettings',
  SELECTED_LEVEL: 'selectedLevel'
};

// Default settings
const DEFAULT_SETTINGS = {
  wordsPerDay: 5,
  autoPlayAudio: false,
  dictionaryApi: 'local',
  apiKey: '',
  syncData: true,
  defaultLevel: 'easy'
};

// DOM elements
const elements = {
  wordsPerDay: document.getElementById('wordsPerDay'),
  autoPlayAudio: document.getElementById('autoPlayAudio'),
  dictionaryApi: document.getElementById('dictionaryApi'),
  apiKeyContainer: document.getElementById('apiKeyContainer'),
  apiKey: document.getElementById('apiKey'),
  syncData: document.getElementById('syncData'),
  defaultLevel: document.getElementById('defaultLevel'),
  saveSettings: document.getElementById('saveSettings'),
  saveMessage: document.getElementById('saveMessage'),
  resetProgress: document.getElementById('resetProgress')
};

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  // Load current settings
  await loadSettings();
  
  // Set up event listeners
  setupEventListeners();
});

// Load user settings from storage
async function loadSettings() {
  try {
    // Determine which storage to use (sync or local) based on current setting
    // Default to local for initial load
    const storage = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
    const userSettings = storage[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
    
    // Apply settings to form
    elements.wordsPerDay.value = userSettings.wordsPerDay;
    elements.autoPlayAudio.checked = userSettings.autoPlayAudio;
    elements.dictionaryApi.value = userSettings.dictionaryApi;
    elements.apiKey.value = userSettings.apiKey || '';
    elements.syncData.checked = userSettings.syncData;
    elements.defaultLevel.value = userSettings.defaultLevel || 'easy';
    
    // Show/hide API key field based on selected API
    toggleApiKeyField(userSettings.dictionaryApi);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save user settings to storage
async function saveSettings() {
  try {
    // Gather settings from form
    const userSettings = {
      wordsPerDay: parseInt(elements.wordsPerDay.value) || DEFAULT_SETTINGS.wordsPerDay,
      autoPlayAudio: elements.autoPlayAudio.checked,
      dictionaryApi: elements.dictionaryApi.value,
      apiKey: elements.apiKey.value.trim(),
      syncData: elements.syncData.checked,
      defaultLevel: elements.defaultLevel.value
    };
    
    // Validate settings
    if (userSettings.wordsPerDay < 1) userSettings.wordsPerDay = 1;
    if (userSettings.wordsPerDay > 10) userSettings.wordsPerDay = 10;
    
    // Determine which storage to use
    const storageArea = userSettings.syncData ? chrome.storage.sync : chrome.storage.local;
    
    // Save settings
    await storageArea.set({ [STORAGE_KEYS.SETTINGS]: userSettings });
    
    // Also save to local storage for initial loading
    await chrome.storage.local.set({ 
      [STORAGE_KEYS.SETTINGS]: userSettings,
      // Update selected level based on default level setting
      [STORAGE_KEYS.SELECTED_LEVEL]: userSettings.defaultLevel
    });
    
    // Show success message
    elements.saveMessage.style.display = 'block';
    setTimeout(() => {
      elements.saveMessage.style.display = 'none';
    }, 3000);
    
    // Notify background script of settings change
    chrome.runtime.sendMessage({ action: 'settingsChanged' });
    
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// Reset user progress
async function resetProgress() {
  if (confirm('Are you sure you want to reset your progress? This will delete all your learned words and history. This action cannot be undone.')) {
    try {
      // Clear learned words and count
      await chrome.storage.local.set({
        [STORAGE_KEYS.LEARNED_WORDS]: [],
        [STORAGE_KEYS.TOTAL_COUNT]: 0
      });
      
      // If using sync, clear there too
      const storage = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
      const userSettings = storage[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
      
      if (userSettings.syncData) {
        await chrome.storage.sync.set({
          [STORAGE_KEYS.LEARNED_WORDS]: [],
          [STORAGE_KEYS.TOTAL_COUNT]: 0
        });
      }
      
      alert('Your progress has been reset successfully.');
      return true;
    } catch (error) {
      console.error('Error resetting progress:', error);
      alert('There was an error resetting your progress. Please try again.');
      return false;
    }
  }
  return false;
}

// Show/hide API key field based on selected API
function toggleApiKeyField(apiValue) {
  if (apiValue === 'local') {
    elements.apiKeyContainer.style.display = 'none';
  } else {
    elements.apiKeyContainer.style.display = 'block';
  }
}

// Set up event listeners
function setupEventListeners() {
  // Dictionary API change
  elements.dictionaryApi.addEventListener('change', () => {
    toggleApiKeyField(elements.dictionaryApi.value);
  });
  
  // Save settings
  elements.saveSettings.addEventListener('click', async () => {
    const success = await saveSettings();
    if (success) {
      // If words per day changed, trigger a reset in the background
      chrome.runtime.sendMessage({ action: 'settingsChanged' });
    }
  });
  
  // Reset progress
  elements.resetProgress.addEventListener('click', resetProgress);
}
