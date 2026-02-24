import { useRef, useState, useCallback } from 'react'

const SERVER_URL = 'ws://localhost:3000'

/**
 * useWebSocket – manages the WebSocket lifecycle for a Peer Bridge room.
 *
 * Returns:
 *   connect(roomId)   – open a socket and join the room
 *   disconnect()      – close the socket
 *   sendMessage(text) – broadcast a text message to peers
 *   messages          – array of { id, type, text } objects
 *   status            – 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'
 */
export function useWebSocket() {
  const socketRef = useRef(null)
  const roomRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('idle')

  const addMessage = useCallback((text, type) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), text, type },
    ])
  }, [])

  const connect = useCallback(
    (roomId) => {
      if (socketRef.current) {
        socketRef.current.close()
      }

      setStatus('connecting')
      setMessages([])
      roomRef.current = roomId

      const ws = new WebSocket(SERVER_URL)
      socketRef.current = ws

      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ type: 'join', room: roomId }))
        setStatus('connected')
      })

      ws.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data)

          switch (msg.type) {
            case 'joined':
              addMessage(
                `✓ Joined room "${msg.room}" (${msg.peers} peer(s) connected).`,
                'info',
              )
              break
            case 'message':
              addMessage(`Peer: ${msg.text}`, 'peer')
              break
            default:
              console.log('[peer-bridge] Unknown message type:', msg)
          }
        } catch {
          console.warn('[peer-bridge] Unexpected non-JSON message:', event.data)
        }
      })

      ws.addEventListener('close', () => {
        setStatus('disconnected')
        addMessage('⚠ Disconnected from server.', 'info')
      })

      ws.addEventListener('error', () => {
        setStatus('error')
        addMessage('⚠ Connection error. Is the server running?', 'info')
      })
    },
    [addMessage],
  )

  const disconnect = useCallback(() => {
    socketRef.current?.close()
    socketRef.current = null
    roomRef.current = null
    setStatus('idle')
    setMessages([])
  }, [])

  const sendMessage = useCallback(
    (text) => {
      const ws = socketRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN || !roomRef.current) return

      ws.send(JSON.stringify({ type: 'message', room: roomRef.current, text }))
      addMessage(`You: ${text}`, 'self')
    },
    [addMessage],
  )

  return { connect, disconnect, sendMessage, messages, status }
}
