import { useRef, useState, useCallback } from 'react'

const SERVER_URL = 'ws://localhost:3000'
const ROOM_CAPACITY = 10

const ERROR_MESSAGES = {
  INVALID_ROOM_ID: 'Room ID must be a valid UUIDv4.',
  INVALID_USERNAME: 'Username is required.',
  INVALID_PASSCODE_FORMAT: 'Passcode must be 6-32 characters.',
  ROOM_NOT_FOUND: 'Room not found. Ask owner to create it first.',
  INVALID_PASSCODE: 'Incorrect passcode.',
  DUPLICATE_USERNAME: 'This username is already in use in the room.',
  ROOM_FULL: 'Room is full (10/10).',
  ROOM_CLOSED: 'Owner closed the room. You have been removed.',
}

export function getServerErrorMessage(code) {
  return ERROR_MESSAGES[code] || 'Unable to join room. Please try again.'
}

/**
 * useWebSocket – manages the WebSocket lifecycle for a Peer Bridge room.
 */
export function useWebSocket() {
  const socketRef = useRef(null)
  const roomRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('idle')
  const [peers, setPeers] = useState(0)
  const [capacity, setCapacity] = useState(ROOM_CAPACITY)

  const addMessage = useCallback((text, type) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), text, type }])
  }, [])

  const connect = useCallback(
    ({ roomId, username, passcode, flow = 'join' }) => {
      if (socketRef.current) {
        socketRef.current.close()
      }

      setStatus('connecting')
      setMessages([])
      setPeers(0)
      setCapacity(ROOM_CAPACITY)
      roomRef.current = roomId

      const ws = new WebSocket(SERVER_URL)
      socketRef.current = ws

      return new Promise((resolve) => {
        let settled = false
        let joined = false

        function resolveOnce(value) {
          if (settled) return
          settled = true
          resolve(value)
        }

        ws.addEventListener('open', () => {
          ws.send(
            JSON.stringify({
              type: 'join',
              flow,
              room: roomId,
              username,
              passcode,
            }),
          )
        })

        ws.addEventListener('message', (event) => {
          try {
            const msg = JSON.parse(event.data)

            switch (msg.type) {
              case 'joined':
                joined = true
                setStatus('connected')
                setPeers(msg.peers ?? 1)
                setCapacity(msg.capacity ?? ROOM_CAPACITY)
                if (flow === 'create') {
                  addMessage(`✓ Created room "${msg.room}" as ${msg.username}.`, 'info')
                } else {
                  addMessage(`✓ Joined room "${msg.room}" as ${msg.username}.`, 'info')
                }
                resolveOnce({ ok: true })
                break
              case 'presence':
                setPeers(msg.peers ?? 0)
                setCapacity(msg.capacity ?? ROOM_CAPACITY)
                break
              case 'message':
                addMessage(`Peer (${msg.from}): ${msg.text}`, 'peer')
                break
              case 'error': {
                const errorMessage = getServerErrorMessage(msg.code)
                setStatus('error')
                resolveOnce({ ok: false, code: msg.code, message: errorMessage })
                ws.close()
                break
              }
              default:
                console.log('[peer-bridge] Unknown message type:', msg)
            }
          } catch {
            console.warn('[peer-bridge] Unexpected non-JSON message:', event.data)
          }
        })

        ws.addEventListener('close', () => {
          if (!settled) {
            resolveOnce({ ok: false, message: 'Connection closed before join completed.' })
          }

          if (joined) {
            addMessage('⚠ Disconnected from server.', 'info')
          }
          setStatus('disconnected')
        })

        ws.addEventListener('error', () => {
          setStatus('error')
          resolveOnce({ ok: false, message: 'Connection error. Is the server running?' })
        })
      })
    },
    [addMessage],
  )

  const disconnect = useCallback(() => {
    socketRef.current?.close()
    socketRef.current = null
    roomRef.current = null
    setStatus('idle')
    setPeers(0)
    setCapacity(ROOM_CAPACITY)
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

  return { connect, disconnect, sendMessage, messages, status, peers, capacity }
}
