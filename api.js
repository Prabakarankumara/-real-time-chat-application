import { buildRequestUrl, detectProvider, getApiHeaders, getConfig } from './config.js';

function parsePayloadText(payload, provider) {
  if (!payload || typeof payload !== 'object') return '';

  if (provider === 'gemini') {
    const parts = payload?.candidates?.[0]?.content?.parts || [];
    if (parts.length) {
      return parts.map((part) => part?.text || '').join('');
    }
    return payload?.candidates?.[0]?.content?.text || payload?.text || '';
  }

  const message = payload?.choices?.[0]?.message;
  if (message?.content) {
    if (typeof message.content === 'string') return message.content;
    if (Array.isArray(message.content)) {
      return message.content.map((part) => part?.text || '').join('');
    }
  }

  const delta = payload?.choices?.[0]?.delta;
  if (delta?.content) {
    if (typeof delta.content === 'string') return delta.content;
    if (Array.isArray(delta.content)) {
      return delta.content.map((part) => part?.text || '').join('');
    }
  }

  const directText = payload?.content || payload?.text || payload?.output_text || payload?.message?.content || '';
  if (typeof directText === 'string') return directText;
  if (Array.isArray(directText)) {
    return directText.map((part) => part?.text || '').join('');
  }
  return '';
}

function tryParseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function localFallbackResponse(messages, onChunk, onDone, signal) {
  const userMessage = messages.slice().reverse().find((message) => message.role === 'user')?.content || 'Hello there!';
  let responseText = 'Hello! I am Nova, your offline assistant. You can chat without setting up an API key.';

  const normalized = userMessage.trim().toLowerCase();
  if (/^(hi|hello|hey|yo)\b/.test(normalized)) {
    responseText = 'Hi there! This is an offline demo response so you can chat immediately.';
  } else if (normalized.includes('how are you')) {
    responseText = 'I am doing great, thanks! I am running in offline demo mode and ready to help.';
  } else if (normalized.includes('help')) {
    responseText = 'Sure! Ask me anything and I will reply using the local demo assistant.';
  } else if (normalized.length < 50) {
    responseText = `You said: "${userMessage}". I’m replying locally while this app is in demo mode.`;
  } else {
    responseText = `Thanks for your message. Here is a local demo answer based on what you wrote: "${userMessage}".`;
  }

  console.log('[AI] Offline fallback response', responseText);
  const fragments = responseText.split(/(\s+)/);
  for (const fragment of fragments) {
    if (signal?.aborted) {
      onDone(responseText);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
    onChunk(fragment);
  }
  onDone(responseText);
}

export async function sendMessageToAI(messages, onChunk, onDone, onError, signal) {
  const config = getConfig();
  const provider = detectProvider(config.baseUrl);

  console.log('[AI] Request payload', { provider, model: config.model, messages });

  if (!config.apiKey) {
    await localFallbackResponse(messages, onChunk, onDone, signal);
    return;
  }

  try {
    const requestUrl = buildRequestUrl(config.baseUrl, config);
    let requestBody;

    if (provider === 'gemini') {
      requestBody = {
        contents: (messages || []).map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content || '' }]
        }))
      };
    } else {
      requestBody = {
        model: config.model,
        messages,
        stream: true,
        temperature: 0.7
      };
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: getApiHeaders(config),
      body: JSON.stringify(requestBody),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'The request could not be completed.');
    }

    const contentType = response.headers.get('content-type') || '';
    const isStreamingResponse = contentType.includes('text/event-stream') || provider !== 'gemini';

    if (isStreamingResponse && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        console.log('[AI] Response payload', chunk);
        const segments = chunk.split('\n\n');

        for (const segment of segments) {
          const lines = segment.split('\n').map((line) => line.trim());
          const dataLine = lines.find((line) => line.startsWith('data:'));
          if (!dataLine) continue;

          const payloadText = dataLine.replace(/^data:\s*/, '').trim();
          if (!payloadText || payloadText === '[DONE]') continue;

          const parsed = tryParseJson(payloadText) || payloadText;
          const textChunk = parsePayloadText(parsed, provider);
          console.log('[AI] Parsed AI text', textChunk);

          if (textChunk) {
            fullText += textChunk;
            onChunk(textChunk);
          }
        }
      }

      onDone(fullText);
      return;
    }

    const responseText = await response.text();
    console.log('[AI] Response payload', responseText);
    const parsed = tryParseJson(responseText);
    const content = parsePayloadText(parsed || responseText, provider);
    console.log('[AI] Parsed AI text', content);
    onDone(content);
  } catch (error) {
    if (error.name === 'AbortError') {
      onError('Generation stopped.');
      return;
    }
    onError(error.message || 'Something went wrong while contacting the AI service.');
  }
}
