export default function AccountLoading() {
  return <main className="jarvis-route-loading" role="status" aria-label="Loading workspace">
    <div className="jarvis-loading-bar"/>
    <div className="jarvis-loading-title"/>
    <div className="jarvis-loading-cards">
      <div/><div/><div/>
    </div>
    <span className="sr-only">Opening your workspace…</span>
  </main>;
}
