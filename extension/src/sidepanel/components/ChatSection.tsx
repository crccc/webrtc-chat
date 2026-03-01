import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import type { ChatMessage, Role } from '../../shared/sessionTypes'

interface ChatSectionProps {
  roomId: string
  role: Role
  peers: number
  capacity: number
  messages: ChatMessage[]
  onSend: (text: string) => void
  onLeave: () => void
}

/**
 * ChatSection – displays room status, member capacity, message list, and send row.
 */
export default function ChatSection({
  roomId,
  role,
  peers,
  capacity,
  messages,
  onSend,
  onLeave,
}: ChatSectionProps) {
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <section className="chat-section">
      <div className="status-bar">
        <div>
          Connected to: <span className="room-name">{roomId}</span>
          <span className="role-badge">{role}</span>
          <span className="capacity-badge">
            {peers}/{capacity}
          </span>
        </div>
        <button className="leave-btn" onClick={onLeave} title="Leave room">
          Leave Chat
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
