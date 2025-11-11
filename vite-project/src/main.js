import './style.css'
import { initChatbot } from './chatbot.js'

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatbot, { once: true })
} else {
  initChatbot()
}

