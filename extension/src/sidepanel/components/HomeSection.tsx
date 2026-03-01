interface HomeSectionProps {
  onCreate: () => void
  onJoin: () => void
  signalingServerUrl: string
  onSignalingServerUrlChange: (value: string) => void
  onSaveSignalingServerUrl: () => void
}

/**
 * HomeSection – entry screen to choose create/join flow.
 */
export default function HomeSection({
  onCreate,
  onJoin,
  signalingServerUrl,
  onSignalingServerUrlChange,
  onSaveSignalingServerUrl,
}: HomeSectionProps) {
  return (
    <section className="home-section">
      <p className="home-subtitle">Choose how you want to enter a room.</p>
      <label>
        Signaling Server
        <input
          type="text"
          value={signalingServerUrl}
          onChange={(event) => onSignalingServerUrlChange(event.target.value)}
          placeholder="ws://192.168.1.128:8888"
        />
      </label>
      <button className="secondary-btn" onClick={onSaveSignalingServerUrl}>
        Save Server
      </button>
      <div className="home-actions">
        <button onClick={onCreate}>Create Room</button>
        <button className="secondary-btn" onClick={onJoin}>
          Join Room
        </button>
      </div>
    </section>
  )
}
