import { useEffect, useRef, useState } from 'react'
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
  getSignalingServerUrl,
  setCreatedRoomId,
  setSignalingServerUrl,
} from './utils/storage'
import { getDefaultDevSignalingUrl } from './config/runtime'

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
  const [view, setView] = useState<AppView>('home')
  const [createError, setCreateError] = useState('')
  const [joinError, setJoinError] = useState('')
  const [createdRoomId, setCreatedRoomIdState] = useState<string | null>(null)
  const [signalingServerUrl, setSignalingServerUrlState] = useState(getDefaultDevSignalingUrl())
  const sessionRef = useRef<SessionState>({ roomId: '', role: null, createdRoomId: null })
  const { connect, disconnect, sendMessage, roomId, role, messages, peers, capacity, status } =
    useWebSocket()
  const showChat = status === 'connected' && !!roomId && !!role

  useEffect(() => {
    sessionRef.current = { roomId: roomId ?? '', role, createdRoomId }
  }, [roomId, role, createdRoomId])

  useEffect(() => {
    let cancelled = false

    void getCreatedRoomId().then((storedRoomId) => {
      if (cancelled) return
      setCreatedRoomIdState(storedRoomId)
      if (storedRoomId && status !== 'connected') {
        setView('create')
      }
    })

    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    let cancelled = false

    void getSignalingServerUrl().then((storedServerUrl) => {
      if (cancelled) return
      setSignalingServerUrlState(storedServerUrl || getDefaultDevSignalingUrl())
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (status === 'connected' && roomId && role) {
      setView('chat')
    }
  }, [status, roomId, role])

  useEffect(() => {
    if (view !== 'chat' || status !== 'disconnected') return

    const timer = window.setTimeout(() => {
      const {
        roomId: currentRoomId,
        role: currentRole,
        createdRoomId: currentCreatedRoomId,
      } = sessionRef.current

      if (currentRole === 'owner' && currentRoomId === currentCreatedRoomId) {
        void clearCreatedRoomId()
        setCreatedRoomIdState(null)
      }

      setView('home')
      sessionRef.current = { roomId: '', role: null, createdRoomId: null }
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [status, view])

  async function handleCreate(payload: RoomFormPayload) {
    setCreateError('')

    const result = await connect({ ...payload, flow: 'create' })
    if (!result.ok) {
      setCreateError(result.message)
      return
    }

    await setCreatedRoomId(payload.roomId)
    setCreatedRoomIdState(payload.roomId)
    setView('chat')
  }

  async function handleJoin(payload: RoomFormPayload) {
    setJoinError('')

    const result = await connect({ ...payload, flow: 'join' })
    if (!result.ok) {
      setJoinError(result.message)
      return
    }

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
      void clearCreatedRoomId()
      setCreatedRoomIdState(null)
    }

    disconnect()
    setView('home')
    sessionRef.current = { roomId: '', role: null, createdRoomId: null }
  }

  async function handleSaveSignalingServerUrl() {
    await setSignalingServerUrl(signalingServerUrl)
  }

  return (
    <div className="popup-root">
      <h1 className="app-title">Peer Bridge</h1>

      {!showChat && view === 'home' && (
        <HomeSection
          onCreate={handleOpenCreate}
          onJoin={handleOpenJoin}
          signalingServerUrl={signalingServerUrl}
          onSignalingServerUrlChange={setSignalingServerUrlState}
          onSaveSignalingServerUrl={handleSaveSignalingServerUrl}
        />
      )}

      {!showChat && view === 'create' && (
        <CreateRoomSection
          onCreate={handleCreate}
          onBack={() => setView('home')}
          errorMessage={createError}
          initialRoomId={createdRoomId || ''}
        />
      )}

      {!showChat && view === 'join' && (
        <JoinSection
          onJoin={handleJoin}
          onBack={() => setView('home')}
          errorMessage={joinError}
        />
      )}

      {showChat && role && roomId && (
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
