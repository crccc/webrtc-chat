import { useState, type KeyboardEvent } from 'react'
import { generateUuidV4 } from '../utils/uuid'
import type { RoomFormPayload } from '../types'

interface CreateRoomSectionProps {
  onCreate: (payload: RoomFormPayload) => void
  onBack: () => void
  errorMessage?: string
  initialRoomId?: string
}

/**
 * CreateRoomSection – auto-generates room id and collects username/passcode.
 * Calls onCreate({ roomId, username, passcode }) when submitted.
 */
export default function CreateRoomSection({
  onCreate,
  onBack,
  errorMessage = '',
  initialRoomId = '',
}: CreateRoomSectionProps) {
  const [roomId, setRoomId] = useState(() => initialRoomId || generateUuidV4())
  const [username, setUsername] = useState('')
  const [passcode, setPasscode] = useState('')
  const [localError, setLocalError] = useState('')

  function validate() {
    const trimmedUsername = username.trim()
    const trimmedPasscode = passcode.trim()

    if (!trimmedUsername) return 'Username is required.'
    if (trimmedPasscode.length < 6 || trimmedPasscode.length > 32) {
      return 'Passcode must be 6-32 characters.'
    }
    return ''
  }

  function handleCreate() {
    const validationError = validate()
    if (validationError) {
      setLocalError(validationError)
      return
    }

    setLocalError('')
    onCreate({
      roomId,
      username: username.trim(),
      passcode: passcode.trim(),
    })
  }

  function handleRegenerate() {
    setRoomId(generateUuidV4())
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleCreate()
  }

  const visibleError = localError || errorMessage

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

      <label htmlFor="create-username-input">Username</label>
      <input
        id="create-username-input"
        type="text"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value)
          if (localError) setLocalError('')
        }}
        onKeyDown={handleKeyDown}
        placeholder="e.g. alice"
      />

      <label htmlFor="create-passcode-input">Passcode</label>
      <input
        id="create-passcode-input"
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
        <button className="secondary-btn" onClick={handleRegenerate}>
          Regenerate
        </button>
        <button onClick={handleCreate}>Create Room</button>
      </div>
    </section>
  )
}
