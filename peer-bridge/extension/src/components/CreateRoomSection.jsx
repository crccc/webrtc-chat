import { useState } from 'react'
import { generateUuidV4 } from '../utils/uuid'

/**
 * CreateRoomSection – auto-generates a room id and lets the user create a room.
 * Calls onCreate(roomId) when submitted.
 */
export default function CreateRoomSection({ onCreate, onBack }) {
  const [roomId, setRoomId] = useState(() => generateUuidV4())

  function handleCreate() {
    onCreate(roomId)
  }

  function handleRegenerate() {
    setRoomId(generateUuidV4())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleCreate()
  }

  return (
    <section className="join-section">
      <label htmlFor="create-room-input">Room ID</label>
      <input
        id="create-room-input"
        type="text"
        value={roomId}
        onKeyDown={handleKeyDown}
        readOnly
        autoFocus
      />
      <div className="section-actions">
        <button className="secondary-btn" onClick={onBack}>
          Back
        </button>
        <button className="secondary-btn" onClick={handleRegenerate}>
          Regenerate
        </button>
        <button onClick={handleCreate}>Create Room</button>
      </div>
    </section>
  )
}
