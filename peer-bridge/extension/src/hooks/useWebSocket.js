import { useRef, useState, useCallback } from 'react'
import { getIceConfiguration } from '../webrtc/iceConfig'

const SERVER_URL = 'ws://localhost:3000'
const ROOM_CAPACITY = 8

const ERROR_MESSAGES = {
  INVALID_ROOM_ID: 'Room ID must be a valid UUIDv4.',
  INVALID_USERNAME: 'Username is required.',
  INVALID_PASSCODE_FORMAT: 'Passcode must be 6-32 characters.',
  ROOM_NOT_FOUND: 'Room not found. Ask owner to create it first.',
  INVALID_PASSCODE: 'Incorrect passcode.',
  DUPLICATE_USERNAME: 'This username is already in use in the room.',
  ROOM_FULL: 'Room is full (8/8).',
  NOT_IN_ROOM: 'You are not in an active room.',
  INVALID_SIGNAL_PAYLOAD: 'Signal payload is invalid.',
  TARGET_NOT_FOUND: 'Target peer was not found in this room.',
  ROOM_CLOSED: 'Room was closed.',
}

export function getServerErrorMessage(code) {
  return ERROR_MESSAGES[code] || 'Unable to join room. Please try again.'
}

export function shouldInitiateOffer(localPeerId, remotePeerId) {
  if (!localPeerId || !remotePeerId) return false
  return localPeerId < remotePeerId
}

export function decodeChannelMessage(data, fallbackFrom) {
  if (typeof data !== 'string' || data.trim().length === 0) return null

  try {
    const parsed = JSON.parse(data)
    if (typeof parsed?.text !== 'string' || parsed.text.trim().length === 0) return null
    return {
      from: typeof parsed.from === 'string' && parsed.from.trim().length > 0 ? parsed.from : fallbackFrom,
      text: parsed.text.trim(),
    }
  } catch {
    return {
      from: fallbackFrom,
      text: data.trim(),
    }
  }
}

/**
 * useWebSocket – signaling + WebRTC DataChannel realtime hook.
 */
export function useWebSocket() {
  const socketRef = useRef(null)
  const roomRef = useRef(null)
  const usernameRef = useRef('')
  const peerIdRef = useRef('')
  const peersRef = useRef(new Map())
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('idle')
  const [peers, setPeers] = useState(0)
  const [capacity, setCapacity] = useState(ROOM_CAPACITY)

  const addMessage = useCallback((text, type) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), text, type }])
  }, [])

  const sendSignal = useCallback((action, to, payload) => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ action, to, payload }))
  }, [])

  const closePeer = useCallback((remotePeerId) => {
    const entry = peersRef.current.get(remotePeerId)
    if (!entry) return
    try {
      entry.dc?.close()
    } catch {
      // Ignore close failures.
    }
    try {
      entry.pc?.close()
    } catch {
      // Ignore close failures.
    }
    peersRef.current.delete(remotePeerId)
  }, [])

  const closeAllPeers = useCallback(() => {
    for (const remotePeerId of peersRef.current.keys()) {
      closePeer(remotePeerId)
    }
    peersRef.current.clear()
  }, [closePeer])

  const setupDataChannel = useCallback(
    (remotePeerId, dc) => {
      const existing = peersRef.current.get(remotePeerId)
      if (!existing) return
      existing.dc = dc
      dc.onmessage = (event) => {
        const parsed = decodeChannelMessage(event.data, remotePeerId)
        if (!parsed) return
        addMessage(`Peer (${parsed.from}): ${parsed.text}`, 'peer')
      }
      dc.onerror = () => {
        // Keep channel errors non-fatal for other peers.
      }
    },
    [addMessage],
  )

  const ensurePeerConnection = useCallback(
    (remotePeerId, { initiator }) => {
      if (!remotePeerId || remotePeerId === peerIdRef.current) return null

      const existing = peersRef.current.get(remotePeerId)
      if (existing) return existing

      if (typeof RTCPeerConnection !== 'function') {
        return null
      }

      const pc = new RTCPeerConnection(getIceConfiguration())
      const entry = { pc, dc: null }
      peersRef.current.set(remotePeerId, entry)

      pc.onicecandidate = (event) => {
        if (!event.candidate) return
        sendSignal('ice', remotePeerId, event.candidate)
      }

      pc.ondatachannel = (event) => {
        setupDataChannel(remotePeerId, event.channel)
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          closePeer(remotePeerId)
        }
      }

      if (initiator) {
        const dc = pc.createDataChannel('chat', { ordered: true })
        setupDataChannel(remotePeerId, dc)
      }

      return entry
    },
    [closePeer, sendSignal, setupDataChannel],
  )

  const createAndSendOffer = useCallback(
    async (remotePeerId) => {
      const entry = ensurePeerConnection(remotePeerId, { initiator: true })
      if (!entry) return
      try {
        const offer = await entry.pc.createOffer()
        await entry.pc.setLocalDescription(offer)
        sendSignal('offer', remotePeerId, entry.pc.localDescription || offer)
      } catch (error) {
        console.warn('[peer-bridge] offer negotiation failed', error)
      }
    },
    [ensurePeerConnection, sendSignal],
  )

  const onPeerJoined = useCallback(
    (remotePeerId) => {
      if (!remotePeerId || remotePeerId === peerIdRef.current) return
      if (shouldInitiateOffer(peerIdRef.current, remotePeerId)) {
        void createAndSendOffer(remotePeerId)
        return
      }
      ensurePeerConnection(remotePeerId, { initiator: false })
    },
    [createAndSendOffer, ensurePeerConnection],
  )

  const onPeerLeft = useCallback(
    (remotePeerId) => {
      closePeer(remotePeerId)
    },
    [closePeer],
  )

  const onSignalOffer = useCallback(
    async (msg) => {
      const remotePeerId = typeof msg.from === 'string' ? msg.from : ''
      const payload = msg.payload
      if (!remotePeerId || !payload) return

      try {
        const entry = ensurePeerConnection(remotePeerId, { initiator: false })
        if (!entry) return
        await entry.pc.setRemoteDescription(payload)
        const answer = await entry.pc.createAnswer()
        await entry.pc.setLocalDescription(answer)
        sendSignal('answer', remotePeerId, entry.pc.localDescription || answer)
      } catch (error) {
        console.warn('[peer-bridge] failed to handle offer', error)
      }
    },
    [ensurePeerConnection, sendSignal],
  )

  const onSignalAnswer = useCallback(async (msg) => {
    const remotePeerId = typeof msg.from === 'string' ? msg.from : ''
    const payload = msg.payload
    if (!remotePeerId || !payload) return
    const entry = peersRef.current.get(remotePeerId)
    if (!entry) return
    try {
      await entry.pc.setRemoteDescription(payload)
    } catch (error) {
      console.warn('[peer-bridge] failed to handle answer', error)
    }
  }, [])

  const onSignalIce = useCallback(async (msg) => {
    const remotePeerId = typeof msg.from === 'string' ? msg.from : ''
    const payload = msg.payload
    if (!remotePeerId || !payload) return
    const entry = peersRef.current.get(remotePeerId)
    if (!entry) return
    try {
      await entry.pc.addIceCandidate(payload)
    } catch (error) {
      console.warn('[peer-bridge] failed to add ice candidate', error)
    }
  }, [])

  const connect = useCallback(
    ({ roomId, username, passcode, flow = 'join' }) => {
      if (socketRef.current) {
        socketRef.current.close(1000, 'REPLACED_SESSION')
      }
      closeAllPeers()

      setStatus('connecting')
      setMessages([])
      setPeers(0)
      setCapacity(ROOM_CAPACITY)
      roomRef.current = roomId
      usernameRef.current = username
      peerIdRef.current = ''

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
              action: 'join',
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
                peerIdRef.current = msg.peerId || ''
                setPeers(msg.peers ?? 1)
                setCapacity(msg.capacity ?? ROOM_CAPACITY)
                if (flow === 'create') {
                  addMessage(`✓ Created room "${msg.room}" as ${msg.username}.`, 'info')
                } else {
                  addMessage(`✓ Joined room "${msg.room}" as ${msg.username}.`, 'info')
                }
                if (Array.isArray(msg.peerList)) {
                  for (const remotePeerId of msg.peerList) {
                    onPeerJoined(remotePeerId)
                  }
                }
                resolveOnce({ ok: true })
                break
              case 'signal.joined':
                onPeerJoined(msg.peerId)
                break
              case 'signal.left':
                onPeerLeft(msg.peerId)
                break
              case 'presence':
                setPeers(msg.peers ?? 0)
                setCapacity(msg.capacity ?? ROOM_CAPACITY)
                break
              case 'offer':
                void onSignalOffer(msg)
                break
              case 'answer':
                void onSignalAnswer(msg)
                break
              case 'ice':
                void onSignalIce(msg)
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
          closeAllPeers()
          if (!settled) {
            resolveOnce({ ok: false, message: 'Connection closed before join completed.' })
          }

          if (joined) {
            addMessage('⚠ Disconnected from server.', 'info')
          }
          setStatus('disconnected')
        })

        ws.addEventListener('error', () => {
          closeAllPeers()
          setStatus('error')
          resolveOnce({ ok: false, message: 'Connection error. Is the server running?' })
        })
      })
    },
    [addMessage, closeAllPeers, onPeerJoined, onPeerLeft, onSignalAnswer, onSignalIce, onSignalOffer],
  )

  const disconnect = useCallback(() => {
    closeAllPeers()
    socketRef.current?.close()
    socketRef.current = null
    roomRef.current = null
    usernameRef.current = ''
    peerIdRef.current = ''
    setStatus('idle')
    setPeers(0)
    setCapacity(ROOM_CAPACITY)
    setMessages([])
  }, [closeAllPeers])

  const sendMessage = useCallback(
    (text) => {
      const trimmed = typeof text === 'string' ? text.trim() : ''
      if (!trimmed) return

      let sent = false
      const payload = JSON.stringify({
        type: 'chat',
        from: usernameRef.current || peerIdRef.current || 'peer',
        text: trimmed,
      })

      for (const entry of peersRef.current.values()) {
        const dc = entry.dc
        if (!dc || dc.readyState !== 'open') continue
        try {
          dc.send(payload)
          sent = true
        } catch (error) {
          console.warn('[peer-bridge] data channel send failed', error)
        }
      }

      if (sent) {
        addMessage(`You: ${trimmed}`, 'self')
      }
    },
    [addMessage],
  )

  return { connect, disconnect, sendMessage, messages, status, peers, capacity }
}
