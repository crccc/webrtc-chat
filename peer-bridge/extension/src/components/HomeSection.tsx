interface HomeSectionProps {
  onCreate: () => void
  onJoin: () => void
}

/**
 * HomeSection – entry screen to choose create/join flow.
 */
export default function HomeSection({ onCreate, onJoin }: HomeSectionProps) {
  return (
    <section className="home-section">
      <p className="home-subtitle">Choose how you want to enter a room.</p>
      <div className="home-actions">
        <button onClick={onCreate}>Create Room</button>
        <button className="secondary-btn" onClick={onJoin}>
          Join Room
        </button>
      </div>
    </section>
  )
}
