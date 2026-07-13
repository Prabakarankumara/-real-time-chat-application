export function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatTimestamp(date) {
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function debounce(fn, delay = 180) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export function highlightCode(code, lang = 'txt') {
  const safeLang = escapeHtml(lang);
  const escaped = escapeHtml(code);
  const keywords = /\b(const|let|var|function|return|if|else|for|while|class|import|export|async|await|new|try|catch|throw|extends|true|false|null|undefined)\b/g;
  const strings = /(['"`])([^'"`]*)\1/g;
  const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
  const html = escaped
    .replace(comments, '<span class="token-comment">$1</span>')
    .replace(strings, '<span class="token-string">$&</span>')
    .replace(keywords, '<span class="token-keyword">$&</span>');

  return `<pre><code class="language-${safeLang}">${html}</code></pre>`;
}
