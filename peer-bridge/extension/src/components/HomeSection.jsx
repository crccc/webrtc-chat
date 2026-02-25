/**
 * HomeSection – entry screen to choose create/join flow.
 */
export default function HomeSection({
  onCreate,
  onJoin,
  createBlocked = false,
  createdRoomId = '',
}) {
  return (
    <section className="home-section">
      <p className="home-subtitle">Choose how you want to enter a room.</p>
      {createBlocked && (
        <p className="guard-note">
          Active created room detected ({createdRoomId}). Leave it first to create
          a new room.
        </p>
      )}
      <div className="home-actions">
        <button onClick={onCreate} disabled={createBlocked}>
          Create Room
        </button>
        <button className="secondary-btn" onClick={onJoin}>
          Join Room
        </button>
      </div>
    </section>
  )
}
