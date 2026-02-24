import { useState, useRef } from 'react'

/**
 * JoinSection – lets the user enter a room ID and click Join Room.
 * Calls onJoin(roomId) when submitted.
 */
export default function JoinSection({ onJoin }) {
  const [roomId, setRoomId] = useState('')
  const inputRef = useRef(null)

  function handleJoin() {
    const trimmed = roomId.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }
    onJoin(trimmed)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleJoin()
  }

  return (
    <section className="join-section">
      <label htmlFor="room-input">Room ID</label>
      <input
        id="room-input"
        ref={inputRef}
        type="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. my-room-123"
        autoFocus
      />
      <button onClick={handleJoin}>Join Room</button>
    </section>
  )
}
