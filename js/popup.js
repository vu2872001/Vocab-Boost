// English Vocabulary Helper - Popup Script
// Handles UI interactions for the popup interface

// Storage keys (must match those in background.js)
const STORAGE_KEYS = {
  LEARNED_WORDS: 'learnedWords',
  DAILY_WORDS: 'dailyWords',
  LAST_UPDATE: 'lastUpdate',
  TOTAL_COUNT: 'totalWordsCount',
  SELECTED_LEVEL: 'selectedLevel'
};

// DOM Elements
const elements = {
  wordsList: document.getElementById('wordsList'),
  wordCount: document.getElementById('wordCount'),
  progressBar: document.getElementById('progressBar'),
  currentDate: document.getElementById('currentDate'),
  historyBtn: document.getElementById('historyBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  historyView: document.getElementById('historyView'),
  backToMainBtn: document.getElementById('backToMainBtn'),
  historyWordsList: document.getElementById('historyWordsList'),
  totalWordsLearned: document.getElementById('totalWordsLearned'),
  milestoneModal: document.getElementById('milestoneModal'),
  milestoneCount: document.getElementById('milestoneCount'),
  milestoneWordsList: document.getElementById('milestoneWordsList'),
  reviewMilestoneBtn: document.getElementById('reviewMilestoneBtn'),
  closeModalBtn: document.querySelector('.close-btn'),
  levelSelect: document.getElementById('levelSelect'),
  historyLevelFilter: document.getElementById('historyLevelFilter')
};

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
  // Set the current date
  updateDateDisplay();
  
  // Load the previously selected level from storage
  await loadSelectedLevel();
  
  // Load data
  await loadWords();
  await updateProgress();
  
  // Set up event listeners
  setupEventListeners();
});

// Update the date display at the top of the popup
function updateDateDisplay() {
  const today = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  elements.currentDate.textContent = `Today's Words - ${today.toLocaleDateString('en-US', options)}`;
}

// Load the previously selected level from storage
async function loadSelectedLevel() {
  try {
    const storage = await chrome.storage.local.get([STORAGE_KEYS.SELECTED_LEVEL]);
    const selectedLevel = storage[STORAGE_KEYS.SELECTED_LEVEL] || 'easy';
    
    // Set the dropdown to the saved level
    elements.levelSelect.value = selectedLevel;
  } catch (error) {
    console.error('Error loading selected level:', error);
    // Default to 'easy' if there's an error
    elements.levelSelect.value = 'easy';
  }
}

// Load daily words from storage, filtered by selected level
async function loadWords() {
  try {
    const storage = await chrome.storage.local.get([
      STORAGE_KEYS.DAILY_WORDS,
      STORAGE_KEYS.LEARNED_WORDS
    ]);
    
    const dailyWords = storage[STORAGE_KEYS.DAILY_WORDS] || [];
    const learnedWords = storage[STORAGE_KEYS.LEARNED_WORDS] || [];
    
    // Get the selected level
    const selectedLevel = elements.levelSelect.value;
    
    // Filter words by the selected level
    const levelFilteredWords = dailyWords.filter(word => word.level === selectedLevel);
    
    // Clear the words list
    elements.wordsList.innerHTML = '';
    
    if (levelFilteredWords.length === 0) {
      elements.wordsList.innerHTML = `<div class="loading">No ${selectedLevel} level words available for today. Please try another level or check again later.</div>`;
      return;
    }
    
    // Check which daily words have already been learned
    const learnedWordSet = new Set(learnedWords.map(word => word.word));
    
    // Create HTML for each word
    levelFilteredWords.forEach(word => {
      const isLearned = learnedWordSet.has(word.word);
      const wordCard = createWordCard(word, isLearned);
      elements.wordsList.appendChild(wordCard);
    });
  } catch (error) {
    console.error('Error loading words:', error);
    elements.wordsList.innerHTML = '<div class="loading">Error loading words. Please try again.</div>';
  }
}

// Create a word card element for a given word
function createWordCard(word, isLearned) {
  const card = document.createElement('div');
  card.className = 'word-card';
  
  card.innerHTML = `
    <div class="word-header">
      <div class="word-title-container">
        <div class="word-title">${word.word}</div>
        <div class="word-level level-${word.level}">${word.level}</div>
      </div>
      <button class="audio-btn" data-audio="${word.audioUrl}" title="Listen to pronunciation">🔊</button>
    </div>
    <div class="word-definition">${word.definition}</div>
    <div class="word-example">${word.example}</div>
    <button class="mark-learned-btn ${isLearned ? 'learned' : ''}" data-word='${JSON.stringify(word)}'>
      ${isLearned ? 'Learned ✓' : 'Mark as Learned'}
    </button>
  `;
  
  // Add event listener for audio button
  const audioBtn = card.querySelector('.audio-btn');
  audioBtn.addEventListener('click', () => {
    playAudio(word.audioUrl);
  });
  
  // Add event listener for mark as learned button
  const learnedBtn = card.querySelector('.mark-learned-btn');
  if (!isLearned) {
    learnedBtn.addEventListener('click', async (e) => {
      await markWordAsLearned(e.target, word);
    });
  }
  
  return card;
}

// Play audio for a word
function playAudio(audioUrl) {
  try {
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      alert('Could not play audio. The pronunciation audio might not be available.');
    });
  } catch (error) {
    console.error('Error creating audio object:', error);
  }
}

// Mark a word as learned
async function markWordAsLearned(button, word) {
  try {
    // Update UI first for responsiveness
    button.classList.add('learned');
    button.textContent = 'Learned ✓';
    button.disabled = true;
    
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'wordLearned',
      word: word
    });
    
    // Update the progress display
    await updateProgress();
    
    // Check if we've hit a milestone
    const milestoneCheck = await chrome.runtime.sendMessage({
      action: 'checkMilestone'
    });
    
    if (milestoneCheck && milestoneCheck.milestone) {
      showMilestoneCelebration(milestoneCheck.count);
    }
  } catch (error) {
    console.error('Error marking word as learned:', error);
    // Revert UI if there was an error
    button.classList.remove('learned');
    button.textContent = 'Mark as Learned';
    button.disabled = false;
  }
}

// Update the progress display
async function updateProgress() {
  try {
    const storage = await chrome.storage.local.get([STORAGE_KEYS.TOTAL_COUNT]);
    const totalCount = storage[STORAGE_KEYS.TOTAL_COUNT] || 0;
    
    // Update count display
    elements.wordCount.textContent = totalCount;
    
    // Update progress bar
    const milestone = 100;
    const progress = (totalCount % milestone) / milestone * 100;
    elements.progressBar.style.width = `${progress}%`;
  } catch (error) {
    console.error('Error updating progress:', error);
  }
}

// Show the milestone celebration modal
async function showMilestoneCelebration(count) {
  try {
    // Update milestone count
    elements.milestoneCount.textContent = count;
    
    // Get all learned words to show in the milestone summary
    const storage = await chrome.storage.local.get([STORAGE_KEYS.LEARNED_WORDS]);
    const learnedWords = storage[STORAGE_KEYS.LEARNED_WORDS] || [];
    
    // Clear the milestone words list
    elements.milestoneWordsList.innerHTML = '';
    
    // Get the last 100 words for the current milestone
    const milestoneWords = learnedWords.slice(-100);
    
    // Group words by level
    const wordsByLevel = {
      easy: milestoneWords.filter(word => word.level === 'easy'),
      medium: milestoneWords.filter(word => word.level === 'medium'),
      hard: milestoneWords.filter(word => word.level === 'hard')
    };
    
    // Create HTML for the milestone summary with level sections
    const levelOrder = ['easy', 'medium', 'hard'];
    
    levelOrder.forEach(level => {
      if (wordsByLevel[level].length > 0) {
        const levelHeading = document.createElement('h3');
        levelHeading.textContent = `${level.charAt(0).toUpperCase() + level.slice(1)} Words`;
        levelHeading.className = `milestone-level-heading level-${level}`;
        elements.milestoneWordsList.appendChild(levelHeading);
        
        wordsByLevel[level].forEach(word => {
          const wordItem = document.createElement('div');
          wordItem.className = 'milestone-word-item';
          wordItem.textContent = word.word;
          elements.milestoneWordsList.appendChild(wordItem);
        });
      }
    });
    
    // Show the modal
    elements.milestoneModal.style.display = 'block';
  } catch (error) {
    console.error('Error showing milestone celebration:', error);
  }
}

// Load and display the learning history, filtered by level if specified
async function loadHistory() {
  try {
    const storage = await chrome.storage.local.get([
      STORAGE_KEYS.LEARNED_WORDS,
      STORAGE_KEYS.TOTAL_COUNT
    ]);
    
    const learnedWords = storage[STORAGE_KEYS.LEARNED_WORDS] || [];
    const totalCount = storage[STORAGE_KEYS.TOTAL_COUNT] || 0;
    
    // Get the selected level filter
    const levelFilter = elements.historyLevelFilter.value;
    
    // Update total words count
    elements.totalWordsLearned.textContent = totalCount;
    
    // Clear the history list
    elements.historyWordsList.innerHTML = '';
    
    if (learnedWords.length === 0) {
      elements.historyWordsList.innerHTML = '<div class="loading">No words learned yet.</div>';
      return;
    }
    
    // Filter words by level if a specific level is selected
    let filteredWords = learnedWords;
    if (levelFilter !== 'all') {
      filteredWords = learnedWords.filter(word => word.level === levelFilter);
      
      if (filteredWords.length === 0) {
        elements.historyWordsList.innerHTML = `<div class="loading">No ${levelFilter} level words learned yet.</div>`;
        return;
      }
    }
    
    // Sort words by date (newest first)
    const sortedWords = [...filteredWords].sort((a, b) => {
      return new Date(b.learnedDate) - new Date(a.learnedDate);
    });
    
    // Create HTML for each learned word
    sortedWords.forEach(word => {
      const wordItem = document.createElement('div');
      wordItem.className = 'history-word-item';
      
      const date = new Date(word.learnedDate);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      wordItem.innerHTML = `
        <div class="history-word-title">
          ${word.word}
          <span class="history-word-level level-${word.level}">${word.level}</span>
        </div>
        <div class="history-word-date">Learned on ${formattedDate}</div>
      `;
      
      elements.historyWordsList.appendChild(wordItem);
    });
  } catch (error) {
    console.error('Error loading history:', error);
    elements.historyWordsList.innerHTML = '<div class="loading">Error loading history. Please try again.</div>';
  }
}

// Set up event listeners for the UI
function setupEventListeners() {
  // Level selector change
  elements.levelSelect.addEventListener('change', async () => {
    const selectedLevel = elements.levelSelect.value;
    
    // Save the selected level to storage
    await chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_LEVEL]: selectedLevel });
    
    // Reload words with the new level
    await loadWords();
  });
  
  // History level filter change
  elements.historyLevelFilter.addEventListener('change', () => {
    loadHistory();
  });
  
  // History button
  elements.historyBtn.addEventListener('click', () => {
    loadHistory();
    elements.historyView.style.display = 'block';
  });
  
  // Back button in history view
  elements.backToMainBtn.addEventListener('click', () => {
    elements.historyView.style.display = 'none';
  });
  
  // Settings button
  elements.settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Close milestone modal
  elements.closeModalBtn.addEventListener('click', () => {
    elements.milestoneModal.style.display = 'none';
  });
  
  // Milestone review button
  elements.reviewMilestoneBtn.addEventListener('click', () => {
    elements.milestoneModal.style.display = 'none';
    loadHistory();
    elements.historyView.style.display = 'block';
  });
  
  // Close milestone modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === elements.milestoneModal) {
      elements.milestoneModal.style.display = 'none';
    }
  });
}
