import { useRef, useState } from 'react'

/**
 * CreateRoomSection – lets the user define a room id and create a room.
 * Calls onCreate(roomId) when submitted.
 */
export default function CreateRoomSection({ onCreate, onBack }) {
  const [roomId, setRoomId] = useState('')
  const inputRef = useRef(null)

  function handleCreate() {
    const trimmed = roomId.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }
    onCreate(trimmed)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleCreate()
  }

  return (
    <section className="join-section">
      <label htmlFor="create-room-input">Room ID</label>
      <input
        id="create-room-input"
        ref={inputRef}
        type="text"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. my-room-123"
        autoFocus
      />
      <div className="section-actions">
        <button className="secondary-btn" onClick={onBack}>
          Back
        </button>
        <button onClick={handleCreate}>Create Room</button>
      </div>
    </section>
  )
}
