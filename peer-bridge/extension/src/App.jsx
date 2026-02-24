import { useState } from 'react'
import './App.css'
import JoinSection from './components/JoinSection'
import ChatSection from './components/ChatSection'
import { useWebSocket } from './hooks/useWebSocket'

/**
 * App – top-level component for the Peer Bridge popup.
 *
 * State machine:
 *   view === 'join'  → show JoinSection
 *   view === 'chat'  → show ChatSection
 */
export default function App() {
  const [view, setView] = useState('join')
  const [roomId, setRoomId] = useState('')
  const { connect, disconnect, sendMessage, messages } = useWebSocket()

  function handleJoin(id) {
    setRoomId(id)
    connect(id)
    setView('chat')
  }

  function handleLeave() {
    disconnect()
    setRoomId('')
    setView('join')
  }

  console.log('App state:', { view, roomId, messages })

  return (
    <div className="popup-root">
      <h1 className="app-title">Peer Bridge</h1>

      {view === 'join' ? (
        <JoinSection onJoin={handleJoin} />
      ) : (
        <ChatSection
          roomId={roomId}
          messages={messages}
          onSend={sendMessage}
          onLeave={handleLeave}
        />
      )}
    </div>
  )
}
