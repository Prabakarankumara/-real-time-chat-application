import { createChat, loadChats, saveChats, loadTheme, saveTheme, addMessage, deleteChatById, renameChat, exportChat, exportChatTxt } from './storage.js';
import { sendMessageToAI } from './api.js';
import { renderChatList, renderMessageList, renderTypingIndicator, showToast } from './ui.js';
import { getConfig, saveConfig } from './config.js';

const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const messagesContainer = document.getElementById('messages');
const composerForm = document.getElementById('composerForm');
const input = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const stopBtn = document.getElementById('stopBtn');
const chatList = document.getElementById('chatList');
const newChatBtn = document.getElementById('newChatBtn');
const historySearch = document.getElementById('historySearch');
const chatTitle = document.getElementById('chatTitle');
const typingIndicator = document.getElementById('typingIndicator');
const themeToggle = document.getElementById('themeToggle');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const settingsForm = document.getElementById('settingsForm');
const apiKeyInput = document.getElementById('apiKeyInput');
const baseUrlInput = document.getElementById('baseUrlInput');
const modelInput = document.getElementById('modelInput');

let chats = loadChats();
let activeChatId = chats[0]?.id || null;
let currentAbortController = null;
let isGenerating = false;
let theme = loadTheme();

function ensureActiveChat() {
  if (!activeChatId) {
    const created = createChat('New conversation');
    chats = [created];
    activeChatId = created.id;
    saveChats(chats);
  }
  return chats.find((chat) => chat.id === activeChatId) || chats[0];
}

function syncActiveChat() {
  const active = ensureActiveChat();
  activeChatId = active.id;
  chatTitle.textContent = active.title;
  renderMessageList(messagesContainer, active.messages);
  renderChatList(chatList, chats, activeChatId, selectChat, promptRename, promptDelete);
  saveChats(chats);
  updateTheme();
  scrollToBottom();
}

function selectChat(chatId) {
  activeChatId = chatId;
  syncActiveChat();
  sidebar.classList.remove('open');
}

function promptRename(chatId) {
  const chat = chats.find((item) => item.id === chatId);
  if (!chat) return;
  const value = prompt('Rename conversation', chat.title);
  if (value && value.trim()) {
    chats = renameChat(chats, chatId, value.trim());
    saveChats(chats);
    syncActiveChat();
    showToast('Conversation renamed');
  }
}

function promptDelete(chatId) {
  const chat = chats.find((item) => item.id === chatId);
  if (!chat) return;
  if (!confirm(`Delete "${chat.title}"?`)) return;
  chats = deleteChatById(chats, chatId);
  if (chats.length === 0) {
    const created = createChat('New conversation');
    chats = [created];
  }
  activeChatId = chats[0].id;
  saveChats(chats);
  syncActiveChat();
  showToast('Conversation deleted');
}

function updateTheme() {
  document.body.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  saveTheme(theme);
}

function openSettings() {
  const config = getConfig();
  apiKeyInput.value = config.apiKey;
  baseUrlInput.value = config.baseUrl;
  modelInput.value = config.model;
  settingsModal.classList.remove('hidden');
}

function closeSettings() {
  settingsModal.classList.add('hidden');
}

function addUserMessage(content) {
  const active = ensureActiveChat();
  if (!active) return null;
  const message = { role: 'user', content, timestamp: Date.now() };
  chats = addMessage(chats, active.id, message);
  activeChatId = active.id;
  syncActiveChat();
  return active.id;
}

function getActiveChatMessages(chatId) {
  return chats.find((chat) => chat.id === chatId)?.messages || [];
}

function getLastAssistantMessage(chatId) {
  const messages = getActiveChatMessages(chatId);
  return messages[messages.length - 1];
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function handleSend(messageText) {
  if (!messageText.trim() || isGenerating) return;

  const activeId = addUserMessage(messageText.trim());
  if (!activeId) return;

  const assistantPlaceholder = { role: 'assistant', content: 'Thinking…', timestamp: Date.now() };
  chats = addMessage(chats, activeId, assistantPlaceholder);
  activeChatId = activeId;
  syncActiveChat();

  renderTypingIndicator(typingIndicator, true);
  isGenerating = true;
  stopBtn.classList.remove('hidden');
  sendBtn.disabled = true;
  input.disabled = true;
  input.value = '';
  autoResize();
  scrollToBottom();

  const activeChatMessages = getActiveChatMessages(activeId).slice(0, -1);
  const payload = activeChatMessages
    .filter((message) => message.content && message.content.trim())
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content
    }));

  currentAbortController = new AbortController();
  sendMessageToAI(
    payload,
    (chunk) => {
      const activeChat = chats.find((chat) => chat.id === activeId);
      if (!activeChat) return;
      const targetMessage = activeChat.messages[activeChat.messages.length - 1];
      if (targetMessage && targetMessage.role === 'assistant') {
        const nextContent = targetMessage.content === 'Thinking…' ? chunk : `${targetMessage.content}${chunk}`;
        targetMessage.content = nextContent;
        targetMessage.isError = false;
        syncActiveChat();
        scrollToBottom();
      }
    },
    (finalText) => {
      const activeChat = chats.find((chat) => chat.id === activeId);
      if (activeChat) {
        const targetMessage = activeChat.messages[activeChat.messages.length - 1];
        if (targetMessage && targetMessage.role === 'assistant') {
          targetMessage.content = finalText && finalText.trim() ? finalText : 'The AI service returned an empty response.';
          targetMessage.isError = !finalText || !finalText.trim();
        }
      }
      renderTypingIndicator(typingIndicator, false);
      isGenerating = false;
      stopBtn.classList.add('hidden');
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
      saveChats(chats);
      scrollToBottom();
      console.log('[UI] Rendering status', { chatId: activeId, hasContent: Boolean(finalText && finalText.trim()) });
    },
    (message) => {
      const activeChat = chats.find((chat) => chat.id === activeId);
      if (activeChat) {
        activeChat.messages = activeChat.messages.filter(
          (messageItem, index, array) => index !== array.length - 1 || messageItem.role !== 'assistant' || messageItem.content !== 'Thinking…'
        );
      }
      renderTypingIndicator(typingIndicator, false);
      isGenerating = false;
      stopBtn.classList.add('hidden');
      sendBtn.disabled = false;
      input.disabled = false;
      showToast(message);
      saveChats(chats);
      syncActiveChat();
      scrollToBottom();
      input.focus();
      if (message.toLowerCase().includes('api key')) {
        openSettings();
      }
      console.log('[UI] Rendering status', { chatId: activeId, error: message });
    },
    currentAbortController.signal
  );
}

function autoResize() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
}

function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    composerForm.requestSubmit();
  }
}

composerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  handleSend(input.value);
});

input.addEventListener('input', autoResize);
input.addEventListener('keydown', handleKeyDown);

newChatBtn.addEventListener('click', () => {
  const newChat = createChat('New conversation');
  chats = [newChat, ...chats];
  activeChatId = newChat.id;
  saveChats(chats);
  syncActiveChat();
  showToast('New chat created');
});

mobileMenuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  updateTheme();
  showToast(`Theme switched to ${theme}`);
});

exportBtn.addEventListener('click', () => {
  const active = ensureActiveChat();
  const jsonBlob = exportChat(active);
  const txtBlob = exportChatTxt(active);

  const jsonLink = document.createElement('a');
  jsonLink.href = URL.createObjectURL(jsonBlob);
  jsonLink.download = `${active.title || 'chat'}.json`;
  jsonLink.click();
  URL.revokeObjectURL(jsonLink.href);

  const txtLink = document.createElement('a');
  txtLink.href = URL.createObjectURL(txtBlob);
  txtLink.download = `${active.title || 'chat'}.txt`;
  txtLink.click();
  URL.revokeObjectURL(txtLink.href);

  showToast('Chat exported as JSON and TXT');
});

importBtn.addEventListener('click', () => importFileInput.click());

importFileInput.addEventListener('change', async (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  const text = await file.text();
  const imported = JSON.parse(text);
  const chat = createChat(imported.title || 'Imported chat');
  chat.messages = imported.messages || [];
  chats = [chat, ...chats];
  activeChatId = chat.id;
  saveChats(chats);
  syncActiveChat();
  showToast('Chat imported');
});

settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
cancelSettingsBtn.addEventListener('click', closeSettings);
settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveConfig({
    apiKey: apiKeyInput.value.trim(),
    baseUrl: baseUrlInput.value.trim(),
    model: modelInput.value.trim()
  });
  closeSettings();
  showToast('Settings saved');
});

stopBtn.addEventListener('click', () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  renderTypingIndicator(typingIndicator, false);
  isGenerating = false;
  stopBtn.classList.add('hidden');
  sendBtn.disabled = false;
  input.disabled = false;
  input.focus();
});

historySearch.addEventListener('input', () => {
  const query = historySearch.value.toLowerCase();
  const filtered = chats.filter((chat) => chat.title.toLowerCase().includes(query) || chat.messages.some((message) => (message.content || '').toLowerCase().includes(query)));
  renderChatList(chatList, filtered, activeChatId, selectChat, promptRename, promptDelete);
});

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    historySearch.focus();
  }
  if (event.key === '/' && document.activeElement !== input) {
    event.preventDefault();
    input.focus();
  }
  if (event.key === 'Escape') {
    sidebar.classList.remove('open');
    closeSettings();
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 900) {
    sidebar.classList.remove('open');
  }
});

updateTheme();
syncActiveChat();
autoResize();
