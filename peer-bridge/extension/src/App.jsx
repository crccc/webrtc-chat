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
  const [createdRoomId, setCreatedRoomIdState] = useState(() => getCreatedRoomId())
  const { connect, disconnect, sendMessage, messages } = useWebSocket()

  function handleCreate(id) {
    setCreatedRoomId(id)
    setCreatedRoomIdState(id)
    setRoomId(id)
    setRole('owner')
    connect(id, 'create')
    setView('chat')
  }

  function handleJoin(id) {
    setRoomId(id)
    setRole('participant')
    connect(id, 'join')
    setView('chat')
  }

  function handleOpenCreate() {
    if (createdRoomId) return
    setView('create')
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
          onJoin={() => setView('join')}
          createBlocked={Boolean(createdRoomId)}
          createdRoomId={createdRoomId || ''}
        />
      )}

      {view === 'create' && (
        <CreateRoomSection onCreate={handleCreate} onBack={() => setView('home')} />
      )}

      {view === 'join' && (
        <JoinSection onJoin={handleJoin} onBack={() => setView('home')} />
      )}

      {view === 'chat' && (
        <ChatSection
          roomId={roomId}
          role={role}
          messages={messages}
          onSend={sendMessage}
          onLeave={handleLeave}
        />
      )}
    </div>
  )
}
