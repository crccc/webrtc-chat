import { useState, useEffect, useRef } from 'react'

/**
 * ChatSection – displays the room status bar, message list, and send row.
 *
 * Props:
 *   roomId      – the current room name
 *   role        – owner | participant
 *   messages    – [{ id, type, text }]
 *   onSend(text) – called when the user sends a message
 *   onLeave()   – called when the user clicks Leave
 */
export default function ChatSection({ roomId, role, messages, onSend, onLeave }) {
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef(null)

  // Auto-scroll to the bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <section className="chat-section">
      <div className="status-bar">
        <div>
          Connected to: <span className="room-name">{roomId}</span>
          <span className="role-badge">{role}</span>
        </div>
        <button className="leave-btn" onClick={onLeave} title="Leave room">
          ✕
        </button>
      </div>

      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.type}`}>
            {m.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-row">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          autoFocus
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </section>
  )
}
