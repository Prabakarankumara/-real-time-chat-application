import { formatTimestamp, escapeHtml, highlightCode } from './utils.js';

export function renderMessageList(messagesContainer, messages) {
  messagesContainer.innerHTML = '';
  messages.forEach((message) => {
    const bubble = document.createElement('article');
    const content = typeof message.content === 'string' ? message.content : '';
    const shouldShowCopy = message.role === 'assistant' && content.trim() && !message.isError && content !== 'Thinking…';
    const body = message.isError ? `<p class="error-text">${escapeHtml(content)}</p>` : renderMarkdown(content || 'Thinking…');

    bubble.className = `message-bubble ${message.role}${message.isError ? ' error' : ''}`;
    bubble.innerHTML = `
      <div class="message-meta">
        <span>${message.role === 'user' ? 'You' : 'Nova AI'}</span>
        <span>${formatTimestamp(message.timestamp)}</span>
      </div>
      <div class="message-content">${body}</div>
      ${shouldShowCopy ? '<button class="copy-btn">Copy</button>' : ''}
    `;

    messagesContainer.appendChild(bubble);
    bubble.querySelector('.copy-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(content);
        showToast('Response copied');
      } catch {
        showToast('Copy failed');
      }
    });
  });
}

export function renderTypingIndicator(el, visible) {
  el.classList.toggle('hidden', !visible);
}

export function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  }, 2200);
}

export function renderChatList(chatList, chats, activeChatId, onSelect, onRename, onDelete) {
  chatList.innerHTML = '';
  chats.forEach((chat) => {
    const item = document.createElement('li');
    item.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
    item.innerHTML = `
      <button class="chat-item-main" data-id="${chat.id}">
        <span>${escapeHtml(chat.title)}</span>
        <small>${new Date(chat.updatedAt).toLocaleDateString()}</small>
      </button>
      <div class="chat-item-actions">
        <button class="icon-btn small" data-action="rename" data-id="${chat.id}">✎</button>
        <button class="icon-btn small" data-action="delete" data-id="${chat.id}">🗑</button>
      </div>
    `;
    item.querySelector('.chat-item-main').addEventListener('click', () => onSelect(chat.id));
    item.querySelector('[data-action="rename"]').addEventListener('click', () => onRename(chat.id));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => onDelete(chat.id));
    chatList.appendChild(item);
  });
}

export function renderMarkdown(content = '') {
  const lines = String(content).split(/\n/);
  let html = '';
  let inFence = false;
  let language = '';
  let codeBuffer = [];
  let inList = false;

  const flushCode = () => {
    if (codeBuffer.length) {
      html += highlightCode(codeBuffer.join('\n'), language);
      codeBuffer = [];
      language = '';
    }
  };

  const flushList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (line.startsWith('```')) {
      flushList();
      if (!inFence) {
        flushCode();
        inFence = true;
        language = line.replace('```', '').trim();
      } else {
        flushCode();
        inFence = false;
      }
      return;
    }

    if (inFence) {
      codeBuffer.push(line);
      return;
    }

    if (/^#{1,3}\s/.test(trimmed)) {
      flushList();
      const level = trimmed.match(/^#+/)[0].length;
      html += `<h${level}>${escapeHtml(trimmed.replace(/^#{1,3}\s/, ''))}</h${level}>`;
    } else if (/^[-*]\s/.test(trimmed)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${escapeHtml(trimmed.replace(/^[-*]\s/, ''))}</li>`;
    } else if (trimmed) {
      flushList();
      html += `<p>${escapeHtml(trimmed)}</p>`;
    } else {
      flushList();
    }
  });

  flushList();
  flushCode();
  return html;
}
