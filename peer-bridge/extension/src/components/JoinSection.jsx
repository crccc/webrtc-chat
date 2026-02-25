import { useState, useRef } from 'react'

/**
 * JoinSection – collects room id, username, and passcode for joining.
 * Calls onJoin({ roomId, username, passcode }) when submitted.
 */
export default function JoinSection({ onJoin, onBack, errorMessage = '' }) {
  const [roomId, setRoomId] = useState('')
  const [username, setUsername] = useState('')
  const [passcode, setPasscode] = useState('')
  const [localError, setLocalError] = useState('')
  const inputRef = useRef(null)

  function validate() {
    const trimmedRoomId = roomId.trim()
    const trimmedUsername = username.trim()
    const trimmedPasscode = passcode.trim()

    if (!trimmedRoomId) return 'Room ID is required.'
    if (!trimmedUsername) return 'Username is required.'
    if (trimmedPasscode.length < 6 || trimmedPasscode.length > 32) {
      return 'Passcode must be 6-32 characters.'
    }

    return ''
  }

  function handleJoin() {
    const validationError = validate()
    if (validationError) {
      setLocalError(validationError)
      if (!roomId.trim()) inputRef.current?.focus()
      return
    }

    setLocalError('')
    onJoin({
      roomId: roomId.trim(),
      username: username.trim(),
      passcode: passcode.trim(),
    })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleJoin()
  }

  const visibleError = localError || errorMessage

  return (
    <section className="join-section">
      <label htmlFor="room-input">Room ID</label>
      <input
        id="room-input"
        ref={inputRef}
        type="text"
        value={roomId}
        onChange={(e) => {
          setRoomId(e.target.value)
          if (localError) setLocalError('')
        }}
        onKeyDown={handleKeyDown}
        placeholder="UUIDv4 room id"
        autoFocus
      />

      <label htmlFor="join-username-input">Username</label>
      <input
        id="join-username-input"
        type="text"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value)
          if (localError) setLocalError('')
        }}
        onKeyDown={handleKeyDown}
        placeholder="e.g. alice"
      />

      <label htmlFor="join-passcode-input">Passcode</label>
      <input
        id="join-passcode-input"
        type="text"
        value={passcode}
        onChange={(e) => {
          setPasscode(e.target.value)
          if (localError) setLocalError('')
        }}
        onKeyDown={handleKeyDown}
        placeholder="6-32 characters"
      />

      {visibleError && <p className="form-error">{visibleError}</p>}

      <div className="section-actions">
        <button className="secondary-btn" onClick={onBack}>
          Back
        </button>
        <button onClick={handleJoin}>Join Room</button>
      </div>
    </section>
  )
}
