const API_KEY = import.meta.env.VITE_GPT_API_KEY
const API_URL = 'https://api.openai.com/v1/chat/completions'

export const DEFAULT_SYSTEM_PROMPT =
  'You are a friendly Korean dinner recommendation assistant. Offer 2-3 creative dinner menu suggestions based on the user request. For each suggestion, include the dish name and a short reason. Keep responses in Korean, use bullet points, and politely offer a follow-up question at the end.'

let messageLog
let inputField
let promptField
let resetButton
let form

export function initChatbot() {
  messageLog = document.querySelector('#messages')
  inputField = document.querySelector('#user-input')
  promptField = document.querySelector('#prompt-editor')
  resetButton = document.querySelector('#prompt-reset')
  form = document.querySelector('#chat-form')

  if (!form || !messageLog || !inputField) {
    console.error('챗봇을 초기화할 수 없어요. index.html 구조를 확인해주세요.')
    return
  }

  setupPromptEditor()

  if (!API_KEY) {
    appendBotMessage(
      '⚠️ 환경 변수 `VITE_GPT_API_KEY`가 설정되어 있지 않아요. Vite 개발 서버를 재시작한 뒤 다시 시도해 주세요.'
    )
    inputField.disabled = true
    form.querySelector('button')?.setAttribute('disabled', 'true')
    resetButton?.setAttribute('disabled', 'true')
    promptField?.setAttribute('disabled', 'true')
    return
  }

  form.addEventListener('submit', handleSubmit)
  inputField.focus()
}

function setupPromptEditor() {
  if (!promptField) return

  promptField.placeholder = DEFAULT_SYSTEM_PROMPT
  if (!promptField.value.trim()) {
    promptField.value = DEFAULT_SYSTEM_PROMPT
  }

  resetButton?.addEventListener('click', () => {
    promptField.value = DEFAULT_SYSTEM_PROMPT
    promptField.focus()
  })
}

async function handleSubmit(event) {
  event.preventDefault()

  const trimmed = inputField.value.trim()
  if (!trimmed || !API_KEY) return

  appendUserMessage(trimmed)
  inputField.value = ''
  inputField.focus()

  const typingIndicator = appendTypingIndicator()

  try {
    const reply = await requestDinnerSuggestion(trimmed)
    removeTypingIndicator(typingIndicator)
    appendBotMessage(reply)
  } catch (error) {
    console.error(error)
    removeTypingIndicator(typingIndicator)
    appendBotMessage(
      '죄송해요, 지금은 메뉴를 추천해 드릴 수 없어요. 인터넷 연결과 API Key를 확인하신 뒤 다시 시도해 주세요.'
    )
  }
}

function appendUserMessage(content) {
  if (!messageLog) return

  const node = document.createElement('div')
  node.className = 'message message--user'
  node.innerHTML = `
    <div class="message__bubble">${escapeHtml(content)}</div>
  `
  messageLog.appendChild(node)
  scrollToBottom()
}

function appendBotMessage(content) {
  if (!messageLog) return

  const node = document.createElement('div')
  node.className = 'message message--bot'
  node.innerHTML = `
    <div class="message__avatar" aria-hidden="true">🍽️</div>
    <div class="message__bubble">${formatBotReply(content)}</div>
  `
  messageLog.appendChild(node)
  scrollToBottom()
}

function appendTypingIndicator() {
  if (!messageLog) return null

  const node = document.createElement('div')
  node.className = 'message message--bot'
  node.innerHTML = `
    <div class="message__avatar" aria-hidden="true">⏳</div>
    <div class="message__bubble message__bubble--typing">
      <span></span><span></span><span></span>
    </div>
  `
  messageLog.appendChild(node)
  scrollToBottom()
  return node
}

function removeTypingIndicator(node) {
  if (node && node.parentNode === messageLog) {
    messageLog.removeChild(node)
  }
}

async function requestDinnerSuggestion(userInput) {
  const systemPrompt = promptField?.value.trim() || DEFAULT_SYSTEM_PROMPT

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: userInput },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`OpenAI API 오류: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const reply = data?.choices?.[0]?.message?.content

  if (!reply) {
    throw new Error('응답에 메시지가 없어요.')
  }

  return reply
}

function scrollToBottom() {
  if (!messageLog) return
  messageLog.scrollTop = messageLog.scrollHeight
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatBotReply(text) {
  return escapeHtml(text)
    .replace(/\r\n|\r|\n/g, '<br />')
    .replace(/^- (.*)$/gm, '<span class="bullet">•</span> $1')
}

