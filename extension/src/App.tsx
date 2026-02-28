import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import HomeSection from './components/HomeSection'
import CreateRoomSection from './components/CreateRoomSection'
import JoinSection from './components/JoinSection'
import ChatSection from './components/ChatSection'
import { useWebSocket } from './hooks/useWebSocket'
import type { AppView, Role, RoomFormPayload } from './types'
import {
  clearCreatedRoomId,
  getCreatedRoomId,
  setCreatedRoomId,
} from './utils/storage'

interface SessionState {
  roomId: string
  role: Role | null
  createdRoomId: string | null
}

/**
 * App – top-level component for the Peer Bridge popup.
 *
 * State machine:
 *   home -> create|join -> chat
 */
export default function App() {
  const [view, setView] = useState<AppView>(() => (getCreatedRoomId() ? 'create' : 'home'))
  const [roomId, setRoomId] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [createError, setCreateError] = useState('')
  const [joinError, setJoinError] = useState('')
  const [createdRoomId, setCreatedRoomIdState] = useState<string | null>(() => getCreatedRoomId())
  const sessionRef = useRef<SessionState>({ roomId: '', role: null, createdRoomId: null })
  const { connect, disconnect, sendMessage, messages, peers, capacity, status } = useWebSocket()

  useEffect(() => {
    sessionRef.current = { roomId, role, createdRoomId }
  }, [roomId, role, createdRoomId])

  const leaveSessionOnClose = useCallback(() => {
    const {
      roomId: currentRoomId,
      role: currentRole,
      createdRoomId: currentCreatedRoomId,
    } = sessionRef.current

    if (!currentRoomId) return

    if (currentRole === 'owner' && currentRoomId === currentCreatedRoomId) {
      clearCreatedRoomId()
    }

    disconnect()
  }, [disconnect])

  useEffect(() => {
    function handleBeforeUnload() {
      leaveSessionOnClose()
    }

    function handlePageHide() {
      leaveSessionOnClose()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      leaveSessionOnClose()
    }
  }, [leaveSessionOnClose])

  useEffect(() => {
    if (view !== 'chat' || status !== 'disconnected') return

    const timer = window.setTimeout(() => {
      if (role === 'owner' && roomId === createdRoomId) {
        clearCreatedRoomId()
        setCreatedRoomIdState(null)
      }

      setRoomId('')
      setRole(null)
      setView('home')
      sessionRef.current = { roomId: '', role: null, createdRoomId: null }
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [status, view, role, roomId, createdRoomId])

  async function handleCreate(payload: RoomFormPayload) {
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

  async function handleJoin(payload: RoomFormPayload) {
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
    sessionRef.current = { roomId: '', role: null, createdRoomId: null }
  }

  return (
    <div className="popup-root">
      <h1 className="app-title">Peer Bridge</h1>

      {view === 'home' && (
        <HomeSection onCreate={handleOpenCreate} onJoin={handleOpenJoin} />
      )}

      {view === 'create' && (
        <CreateRoomSection
          onCreate={handleCreate}
          onBack={() => setView('home')}
          errorMessage={createError}
          initialRoomId={createdRoomId || ''}
        />
      )}

      {view === 'join' && (
        <JoinSection
          onJoin={handleJoin}
          onBack={() => setView('home')}
          errorMessage={joinError}
        />
      )}

      {view === 'chat' && role && (
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
