
"use client";
import {useContext} from "react";
import {InterfaceLanguage, useInterfaceCopy} from "./components/interface-language";
import {UiText} from "@/app/components/interface-language";
import Link from "next/link";

export default function Home() {
  const language = useContext(InterfaceLanguage);
  const t = useInterfaceCopy();
  return (
    <main className="jarvis-landing">
      <div className="jarvis-landing-hero">
        <div>
          <p className="jarvis-landing-eyebrow">{t("THE NEW WAY TO STUDY SMARTER")}</p>
          <h1>{t("Everything academic.")}<br/><span>{t("One workspace.")}</span></h1>
          <p className="jarvis-landing-description">
            {t("Your classes, course materials, tasks, and study time in one place.")}
          </p>
          <div className="jarvis-landing-actions">
            <Link className="jarvis-landing-primary" href={`/account?lang=${language}`}>{t("Open your workspace")} →</Link>
            <span className="jarvis-landing-secondary">{t("Invitation-only access · UFAR pilot")}</span>
          </div>
        </div>
        <div className="jarvis-preview" aria-label={t("Illustration of the JARVIS academic dashboard")}>
          <div className="jarvis-preview-bar"><i/><i/><i/><strong>{t("JARVIS · Academic workspace")}</strong></div>
          <div className="jarvis-preview-content">
            <div className="jarvis-preview-nav"><span>◈ {t("Dashboard")}</span><span>▣ {t("Calendar")}</span><span>☷ {t("Courses")}</span><span>✓ {t("Tasks")}</span><span>◷ {t("Focus")}</span></div>
            <div className="jarvis-preview-main">
              <h2>{t("Good morning.")}</h2>
              <p><UiText value={"Your academic week, organized."}/></p>
              <div className="jarvis-preview-banner"><span>{t("YOUR WORKSPACE")}</span><strong>{t("Make today count.")}</strong></div>
              <div className="jarvis-preview-stats">
                <div className="jarvis-preview-stat"><strong>03</strong><span><UiText value="Classes today"/></span></div>
                <div className="jarvis-preview-stat"><strong>05</strong><span><UiText value={"Tasks to do"}/></span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <nav className="jarvis-integrated-tools" aria-label={t("Explore JARVIS modules")}>
        <Link href="/academics"><UiText value={"Academic records"}/> <span aria-hidden="true">→</span></Link>
        <Link href={`/arena?lang=${language}`}><UiText value={"Arena"}/> <span aria-hidden="true">→</span></Link>
        <Link href="/learning"><UiText value={"Learning tools"}/> <span aria-hidden="true">→</span></Link>
        <Link href="/campus"><UiText value={"Campus resources"}/> <span aria-hidden="true">→</span></Link>
        <Link href="/career"><UiText value={"Career"}/> <span aria-hidden="true">→</span></Link>
        <Link href="/chat"><UiText value={"AI Agent"}/> <span aria-hidden="true">→</span></Link>
        <Link href="/dashboard"><UiText value={"University hub"}/> <span aria-hidden="true">→</span></Link>
      </nav>
      <div className="jarvis-landing-features">
        <article className="jarvis-landing-feature"><i className="jarvis-feature-dot"/><strong><UiText value={"Academic calendar"}/></strong><p>{t("See classes, assignments, study sessions, and your personal time in one place.")}</p></article>
        <article className="jarvis-landing-feature"><i className="jarvis-feature-dot"/><strong><UiText value="Course resources"/></strong><p>{t("Find your lecturer's materials, assignment details, and study resources.")}</p></article>
        <article className="jarvis-landing-feature"><i className="jarvis-feature-dot"/><strong>{t("Role-based workspace")}</strong><p>{t("A focused experience for students, lecturers, and university administrators.")}</p></article>
      </div>
    </main>
  );
}
