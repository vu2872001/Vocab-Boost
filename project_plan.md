# Project Plan for English Vocabulary Helper Chrome Extension

This plan outlines the development of a Chrome Extension to help users learn English vocabulary. It's designed to be modular and extensible, allowing for easy addition of future features. I'll use markdown for clarity, with headings, bullet points, and simple text-based diagrams for wireframes.

## Feature Breakdown
- **Daily Words**: The extension displays 5 new vocabulary words each day, fetched or selected based on the current date and user-selected difficulty level.
- **Audio Pronunciation**: Each word includes a clickable button that plays an audio clip of its correct pronunciation.
- **Examples**: For each word, a sample sentence or usage example is provided to show context.
- **Learning History**: A dedicated section allows users to view all words they've learned, with a count of total words and categorization by date, status, and difficulty level.
- **Milestone Celebrations**: When a user reaches every 100 words learned, a pop-up message congratulates them and summarizes all words up to that milestone, including a quick review option.
- **Word Levels**: New feature to categorize vocabulary words by difficulty (easy, medium, hard). Users can select a starting level or progress automatically based on their learning history, ensuring gradual advancement from basic to advanced words.

## User Interface Sketches or Wireframe Ideas
The UI should be simple, intuitive, and accessible. It primarily uses a popup window for interactions, with potential for a dashboard in the options page.

- **Popup Wireframe (Main Interaction Point)**:
  ```
  +-------------------+
  | English Vocab Helper |
  +-------------------+
  | [Level Selector: Easy/Medium/Hard] Dropdown |
  | [Daily Word 1]    |
  | - Definition      |
  | - Example         |
  | [Play Audio] Button |
  | ----------------- |
  | [Daily Word 2]    |  (Repeat for up to 5 words)
  | ...               |
  | ----------------- |
  | History Button -> Opens history view |
  | Milestone: X/100 words |
  +-------------------+
  ```
  - **Interaction**: Users can change difficulty levels via a dropdown, which updates the daily words. Level is indicated on each word card. Milestones trigger a modal overlay with a congratulatory message.

- **History View Wireframe**:
  ```
  +-------------------+
  | Learning History  |
  +-------------------+
  | [Filter by Level: Easy/Medium/Hard] Dropdown |
  | Word: Example     |
  | Level: Easy       |
  | Date Learned: DD/MM/YYYY |
  | ----------------- |
  | Word: Another     |  (Scrollable list)
  | Level: Medium     |
  | Date Learned: ... |
  | ----------------- |
  | Total Words: 150  |
  | Back Button       |
  +-------------------+
  ```
  - **Interaction**: Added a level filter for history view. Users can sort or filter words by difficulty level. Celebrations appear as a full-screen overlay on milestone achievement.

- **General UX Principles**: Use large, touch-friendly buttons for audio; ensure text is readable with high contrast. Provide feedback like loading spinners for audio or data fetching.

## Data Structure
Store data locally using Chrome's Storage API (chrome.storage.local or sync for cross-device access). This keeps the extension lightweight and offline-capable.

- **Words Data**: An array of objects for vocabulary words, e.g.:
  ```
  [
    {
      "word": "eloquent",
      "definition": "fluent or persuasive in speaking or writing",
      "example": "She gave an eloquent speech that moved the audience.",
      "audioUrl": "path/to/audio.mp3",
      "level": "medium","  // Added level field: 'easy', 'medium', or 'hard'
      "dateAdded": "2025-04-24"
    },
    ...
  ]
  ```
- **Learning History**: An array tracking user interactions, e.g.:
  ```
  [
    {
      "word": "eloquent",
      "learnedDate": "2025-04-24",
      "reviewed": false,
      "level": "medium"  // Added level field to track difficulty
    },
    ...
  ]
  ```
- **Daily Word Index**: Store a counter or date-based key to track the current day's words, now filtered by user-selected level.
- **Milestone Tracker**: A simple integer counter for total words learned, incremented on user confirmation. Track milestones per level if desired.

This structure is extensible: add fields for user notes, difficulty levels, or quiz scores in future updates.

## API or Data Sourcing
Source vocabulary, examples, and audio from reliable, free APIs to avoid hardcoded data and enable updates.

- **Vocabulary and Examples**: Use the Oxford Dictionaries API or similar (e.g., WordsAPI). Ensure data includes difficulty levels; if not available, categorize words in the local dataset or API response. If an API key is required, store it securely in the extension's options.
- **Audio Pronunciation**: Source from APIs like Forvo or Cambridge Dictionary. Handle API requests asynchronously in the background script.
- **Data Fetching Logic**: On extension load or daily reset, fetch or select words based on the user's chosen difficulty level. Cache data locally and use an abstraction layer for switching data sources.

## Milestone Logic
Track milestones by maintaining a cumulative word count in local storage. Increment the count when a user interacts with a word. When the count is a multiple of 100:

- Trigger a celebration: Show a modal with a message and a summary, now filtered by level if the user has progressed through difficulties.
- Review Summary: Display a condensed list or quiz of words, grouped by level for better organization.
- Logic Flow:
  - Check word count and level on each interaction.
  - Allow level progression (e.g., auto-advance after mastering a level).
  - Use event listeners for extensibility.

## Chrome Extension Architecture
Follow Chrome Extension best practices for separation of concerns.

- **Background Script**: Handles persistent tasks like daily word resets, level-based word selection, API fetching, and milestone checks.
- **Content Scripts**: Not needed initially, but could be added for level-based word highlighting on web pages in future integrations.
- **Popup Script**: Manages the UI for daily words, audio playback, history viewing, and now level selection.
- **Options Page**: For user settings, including difficulty level preferences, API keys, and daily word count adjustments.
- **Extensibility**: Use message passing to allow easy addition of level progression logic.

## User Journey
A typical day for a user:
1. **Morning Routine**: User opens Chrome, clicks the extension icon, and selects their preferred difficulty level (e.g., starting with "easy"). The popup shows 5 new words tailored to that level.
2. **Learning Session**: User listens to pronunciations, reads examples, marks words as learned, and progresses to harder levels as they gain confidence.
3. **History Check**: User navigates to the history section to review words, filter by level, and track progress toward milestones.
4. **Milestone Achievement**: If they hit 100 words, a celebration pop-up appears, summarizing words by level to reinforce learning.
5. **End of Day**: The extension resets for new words, respecting the user's level setting.

This journey supports gradual difficulty progression, enhancing user engagement and retention.

## Optional: Suggest Potential Stretch Features
To enhance engagement and learning:
- **Quizzes**: Implement daily multiple-choice quizzes on words, with scoring and feedback, adapted to the user's current level.
- **Spaced Repetition**: Use algorithms to review words at increasing intervals, factoring in difficulty levels for personalized review schedules.
- **Customization**: Allow users to set word difficulty, themes, or import word lists from external sources.
- **Social Sharing**: Enable sharing milestones on social media or competing with friends, including level achievements.
- **Integration**: Add content script to highlight learned words on web pages or sync data with apps like Anki, with level-based filtering.

This plan is designed for extensibility: use modular code, versioned data structures, and clear APIs for future enhancements.
