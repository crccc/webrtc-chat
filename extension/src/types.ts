export type AppView = 'home' | 'create' | 'join' | 'chat'
export type Role = 'owner' | 'participant'
export type MessageType = 'self' | 'peer' | 'info'
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'
export type ConnectFlow = 'create' | 'join'

export interface RoomFormPayload {
  roomId: string
  username: string
  passcode: string
}

export interface ChatMessage {
  id: number
  text: string
  type: MessageType
}

export interface ConnectArgs extends RoomFormPayload {
  flow?: ConnectFlow
}

export interface ConnectFailureResult {
  ok: false
  code?: string
  message: string
}

export interface ConnectSuccessResult {
  ok: true
}

export type ConnectResult = ConnectFailureResult | ConnectSuccessResult

export interface RealtimeHookResult {
  connect: (args: ConnectArgs) => Promise<ConnectResult>
  disconnect: () => void
  sendMessage: (text: string) => void
  messages: ChatMessage[]
  status: ConnectionStatus
  peers: number
  capacity: number
}
