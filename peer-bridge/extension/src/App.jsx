import { useState } from 'react'
import './App.css'
import HomeSection from './components/HomeSection'
import CreateRoomSection from './components/CreateRoomSection'
import JoinSection from './components/JoinSection'
import ChatSection from './components/ChatSection'
import { useWebSocket } from './hooks/useWebSocket'
import {
  clearCreatedRoomId,
  getCreatedRoomId,
  setCreatedRoomId,
} from './utils/storage'

/**
 * App – top-level component for the Peer Bridge popup.
 *
 * State machine:
 *   home -> create|join -> chat
 */
export default function App() {
  const [view, setView] = useState('home')
  const [roomId, setRoomId] = useState('')
  const [role, setRole] = useState(null)
  const [createError, setCreateError] = useState('')
  const [joinError, setJoinError] = useState('')
  const [createdRoomId, setCreatedRoomIdState] = useState(() => getCreatedRoomId())
  const { connect, disconnect, sendMessage, messages, peers, capacity } = useWebSocket()

  async function handleCreate(payload) {
    setCreateError('')

    const result = await connect({ ...payload, flow: 'create' })
    if (!result.ok) {
      setCreateError(result.message)
      return
    }

    setCreatedRoomId(payload.roomId)
    setCreatedRoomIdState(payload.roomId)
    setRoomId(payload.roomId)
    setRole('owner')
    setView('chat')
  }

  async function handleJoin(payload) {
    setJoinError('')

    const result = await connect({ ...payload, flow: 'join' })
    if (!result.ok) {
      setJoinError(result.message)
      return
    }

    setRoomId(payload.roomId)
    setRole('participant')
    setView('chat')
  }

  function handleOpenCreate() {
    if (createdRoomId) return
    setCreateError('')
    setView('create')
  }

  function handleOpenJoin() {
    setJoinError('')
    setView('join')
  }

  function handleLeave() {
    if (role === 'owner' && roomId === createdRoomId) {
      clearCreatedRoomId()
      setCreatedRoomIdState(null)
    }

    disconnect()
    setRoomId('')
    setRole(null)
    setView('home')
  }

  return (
    <div className="popup-root">
      <h1 className="app-title">Peer Bridge</h1>

      {view === 'home' && (
        <HomeSection
          onCreate={handleOpenCreate}
          onJoin={handleOpenJoin}
          createBlocked={Boolean(createdRoomId)}
          createdRoomId={createdRoomId || ''}
        />
      )}

      {view === 'create' && (
        <CreateRoomSection
          onCreate={handleCreate}
          onBack={() => setView('home')}
          errorMessage={createError}
        />
      )}

      {view === 'join' && (
        <JoinSection
          onJoin={handleJoin}
          onBack={() => setView('home')}
          errorMessage={joinError}
        />
      )}

      {view === 'chat' && (
        <ChatSection
          roomId={roomId}
          role={role}
          peers={peers}
          capacity={capacity}
          messages={messages}
          onSend={sendMessage}
          onLeave={handleLeave}
        />
      )}
    </div>
  )
}
