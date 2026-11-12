import Link from "next/link";

export default function Home() {
  return (
    <main className="jarvis-landing">
      <div className="jarvis-landing-hero">
        <div>
          <p className="jarvis-landing-eyebrow">THE NEW WAY TO STUDY SMARTER</p>
          <h1>Everything academic.<br/><span>One workspace.</span></h1>
          <p className="jarvis-landing-description">
            Meet JARVIS, the connected academic workspace for your classes, course materials, tasks, and study time.
            Spend less time organizing and more time learning.
          </p>
          <div className="jarvis-landing-actions">
            <Link className="jarvis-landing-primary" href="/account">Open your workspace →</Link>
            <span className="jarvis-landing-secondary">Invitation-only access · UFAR pilot</span>
          </div>
        </div>
        <div className="jarvis-preview" aria-label="Illustration of the JARVIS academic dashboard">
          <div className="jarvis-preview-bar"><i/><i/><i/><strong>JARVIS · Academic workspace</strong></div>
          <div className="jarvis-preview-content">
            <div className="jarvis-preview-nav"><span>◈ Dashboard</span><span>▣ Calendar</span><span>☷ Courses</span><span>✓ Tasks</span><span>◷ Focus</span></div>
            <div className="jarvis-preview-main">
              <h2>Good morning.</h2>
              <p>Your academic week, organized.</p>
              <div className="jarvis-preview-banner"><span>YOUR WORKSPACE</span><strong>Make today count.</strong></div>
              <div className="jarvis-preview-stats">
                <div className="jarvis-preview-stat"><strong>03</strong><span>Classes today</span></div>
                <div className="jarvis-preview-stat"><strong>05</strong><span>Tasks to do</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <nav className="jarvis-integrated-tools" aria-label="Explore JARVIS modules">
        <Link href="/academics">Academic records <span aria-hidden="true">↗</span></Link>
        <Link href="/learning">Learning tools <span aria-hidden="true">↗</span></Link>
        <Link href="/dashboard">University hub <span aria-hidden="true">↗</span></Link>
        <Link href="/hy" lang="hy">Հայերեն</Link>
      </nav>
      <div className="jarvis-landing-features">
        <article className="jarvis-landing-feature"><i className="jarvis-feature-dot"/><strong>Academic calendar</strong><p>See classes, assignments, study sessions, and your personal time in one place.</p></article>
        <article className="jarvis-landing-feature"><i className="jarvis-feature-dot"/><strong>Course resources</strong><p>Find your lecturer&apos;s materials, assignment details, and study resources.</p></article>
        <article className="jarvis-landing-feature"><i className="jarvis-feature-dot"/><strong>Role-based workspace</strong><p>A focused experience for students, lecturers, and university administrators.</p></article>
      </div>
    </main>
  );
}
