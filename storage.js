import { createId } from './utils.js';

const STORAGE_KEY = 'nova-chat-history';
const THEME_KEY = 'nova-theme';

export function loadChats() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveChats(chats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function createChat(title = 'New conversation') {
  return {
    id: createId(),
    title,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function updateChat(chats, chatId, updater) {
  return chats.map((chat) => (chat.id === chatId ? updater(chat) : chat));
}

export function deleteChatById(chats, chatId) {
  return chats.filter((chat) => chat.id !== chatId);
}

export function renameChat(chats, chatId, newTitle) {
  return updateChat(chats, chatId, (chat) => ({ ...chat, title: newTitle, updatedAt: Date.now() }));
}

export function addMessage(chats, chatId, message) {
  return updateChat(chats, chatId, (chat) => ({
    ...chat,
    messages: [...chat.messages, message],
    updatedAt: Date.now()
  }));
}

export function exportChat(chat) {
  const blob = new Blob([JSON.stringify(chat, null, 2)], { type: 'application/json' });
  return blob;
}

export function exportChatTxt(chat) {
  const lines = [`# ${chat.title}`, '', ...chat.messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`), ''];
  return new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
}
