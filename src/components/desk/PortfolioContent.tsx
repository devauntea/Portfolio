"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CAPABILITIES,
  CONTACT,
  DESK,
  PROJECTS,
  PROJECT_NOTES,
  RESUME,
} from "@/data/profile";

export type Section = (typeof DESK.nav)[number]["id"];

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="desk-arrow"
    >
      <path d={diagonal ? "M5 19 19 5M5 5h14v14" : "M4 12h16m-6-6 6 6-6 6"} />
    </svg>
  );
}

function ProjectArt({ id }: { id: string }) {
  if (id === "aspect-niche")
    return (
      <div className="project-art art-niche" aria-hidden="true">
        <svg viewBox="0 0 600 360">
          <g stroke="currentColor" fill="none" opacity=".3">
            {[
              [130, 100],
              [410, 80],
              [485, 236],
              [160, 290],
              [270, 53],
              [340, 300],
              [70, 215],
            ].map(([x, y], i) => (
              <path
                key={i}
                d={`M300 180 Q${(x + 300) / 2 + 20} ${(y + 180) / 2 - 25} ${x} ${y}`}
              />
            ))}
          </g>
          <g fill="currentColor">
            {[
              [130, 100, 18],
              [410, 80, 25],
              [485, 236, 14],
              [160, 290, 23],
              [270, 53, 9],
              [340, 300, 12],
              [70, 215, 9],
            ].map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} opacity={0.25 + i * 0.07} />
            ))}
            <circle cx="300" cy="180" r="48" />
          </g>
          <g
            fill="var(--desk-paper)"
            fontSize="34"
            fontFamily="Georgia"
            textAnchor="middle"
          >
            <text x="300" y="191">
              a.
            </text>
          </g>
        </svg>
        <span className="art-caption">{DESK.art.niche}</span>
        <span className="art-meta">{DESK.art.nicheCaption}</span>
      </div>
    );
  if (id === "personaforge")
    return (
      <div className="project-art art-forge" aria-hidden="true">
        <div className="forge-line">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="forge-symbol">
          p<span>f</span>
        </div>
        <span className="art-caption">{DESK.art.forge}</span>
        <span className="art-meta">{DESK.art.forgeCaption}</span>
      </div>
    );
  if (id === "pokespire")
    return (
      <div className="project-art art-cards" aria-hidden="true">
        <div className="playing-card card-back" />
        <div className="playing-card card-front">
          <span>PS</span>
          <svg viewBox="0 0 100 120">
            <path
              d="M50 8 77 48 64 48 84 85 59 85 59 111H41V85H16L36 48H23Z"
              fill="currentColor"
            />
          </svg>
          <small>{DESK.art.cardsCaption}</small>
        </div>
        <span className="art-caption">{DESK.art.cards}</span>
      </div>
    );
  return (
    <div className={`project-art art-lines art-${id}`} aria-hidden="true">
      <svg viewBox="0 0 600 360">
        {Array.from({ length: 12 }, (_, i) => (
          <ellipse
            key={i}
            cx="300"
            cy="175"
            rx={50 + i * 12}
            ry={115 - i * 5}
            transform={`rotate(${i * 13} 300 175)`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        ))}
      </svg>
      <span className="art-caption">
        {PROJECT_NOTES[id].category.split(" / ")[0]}
      </span>
    </div>
  );
}

export function WorkContent({ idPrefix = "" }: { idPrefix?: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <section
      className="portfolio-section"
      id={`${idPrefix}work`}
      aria-labelledby={`${idPrefix}work-title`}
    >
      <p className="desk-eyebrow">{DESK.work.eyebrow}</p>
      <h2 id={`${idPrefix}work-title`}>{DESK.work.title}</h2>
      <p className="section-intro">{DESK.work.intro}</p>
      <div className="project-grid">
        {PROJECTS.map((project, index) => {
          const notes = PROJECT_NOTES[project.id];
          const isOpen = expanded === project.id;
          const title =
            project.id === "devauntae-os" ? "The Working Desk" : project.name;
          return (
            <article
              key={project.id}
              className={`project-item ${index > 2 ? "project-item--compact" : ""}`}
            >
              {index < 3 && <ProjectArt id={project.id} />}
              <div className="project-category">
                <span>{notes.category}</span>
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3>{title}</h3>
              <p className="project-summary">{notes.summary}</p>
              <div className="project-tech">
                {project.tech.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div className="project-actions">
                <button
                  aria-expanded={isOpen}
                  aria-controls={`${idPrefix}notes-${project.id}`}
                  onClick={() => setExpanded(isOpen ? null : project.id)}
                >
                  {isOpen ? DESK.work.close : DESK.work.more}
                  <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                </button>
                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${DESK.work.open}: ${title}`}
                  >
                    <Arrow diagonal />
                  </a>
                )}
              </div>
              {isOpen && (
                <div
                  id={`${idPrefix}notes-${project.id}`}
                  className="project-detail"
                >
                  <p>{notes.detail}</p>
                  {project.link ? (
                    <a href={project.link} target="_blank" rel="noreferrer">
                      {DESK.work.open}
                      <Arrow diagonal />
                    </a>
                  ) : (
                    (project.id === "personaforge" ||
                      project.id === "ml-eval") && (
                      <small>{DESK.work.private}</small>
                    )
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function AboutContent({ idPrefix = "" }: { idPrefix?: string }) {
  return (
    <section
      className="portfolio-section"
      id={`${idPrefix}about`}
      aria-labelledby={`${idPrefix}about-title`}
    >
      <p className="desk-eyebrow">{DESK.about.eyebrow}</p>
      <h2 id={`${idPrefix}about-title`}>{DESK.about.title}</h2>
      <div className="about-layout">
        <div className="about-copy">
          <p className="about-lead">{DESK.about.intro}</p>
          <p>{DESK.about.body}</p>
          <p>{DESK.about.personal}</p>
          <blockquote>{DESK.about.philosophy}</blockquote>
        </div>
        <figure className="about-photo">
          <Image
            src="/images/gallery/photo-1.jpg"
            alt={DESK.about.photoAlt}
            width={600}
            height={720}
            sizes="(max-width: 700px) 85vw, 350px"
          />
          <figcaption>{DESK.about.caption}</figcaption>
        </figure>
      </div>
      <div className="personal-gallery">
        {DESK.personalPhotos.map((photo) => (
          <figure key={photo.number}>
            <Image
              src={`/images/gallery/photo-${photo.number}.jpg`}
              alt={photo.alt}
              width={400}
              height={320}
              sizes="(max-width: 700px) 85vw, 260px"
            />
            <figcaption>{photo.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function SkillsContent({ idPrefix = "" }: { idPrefix?: string }) {
  return (
    <section
      className="portfolio-section"
      id={`${idPrefix}skills`}
      aria-labelledby={`${idPrefix}skills-title`}
    >
      <p className="desk-eyebrow">{DESK.skills.eyebrow}</p>
      <h2 id={`${idPrefix}skills-title`}>{DESK.skills.title}</h2>
      <p className="section-intro">{DESK.skills.intro}</p>
      <div className="capabilities">
        {CAPABILITIES.map((item) => (
          <article className="capability" key={item.number}>
            <span className="capability-number">{item.number}</span>
            <div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <div className="skill-tags">
                {item.tools.map((tool) => (
                  <span key={tool}>{tool}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ContactContent({ idPrefix = "" }: { idPrefix?: string }) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }
  return (
    <section
      className="portfolio-section contact-section"
      id={`${idPrefix}contact`}
      aria-labelledby={`${idPrefix}contact-title`}
    >
      <p className="desk-eyebrow">{DESK.contact.eyebrow}</p>
      <h2 id={`${idPrefix}contact-title`}>
        {DESK.contact.title}
        <br />
        <em>{DESK.contact.line}</em>
      </h2>
      <p className="section-intro">{DESK.contact.intro}</p>
      <a className="contact-email" href={`mailto:${CONTACT.email}`}>
        {CONTACT.email}
        <Arrow diagonal />
      </a>
      <button className="copy-email" onClick={copyEmail}>
        {copy === "copied" ? DESK.contact.copied : DESK.contact.copy}
        <span aria-hidden="true">{copy === "copied" ? "✓" : "⧉"}</span>
      </button>
      <p role="status" className="copy-status">
        {copy === "failed"
          ? DESK.contact.copyFailed
          : copy === "copied"
            ? DESK.contact.copied
            : ""}
      </p>
      <p className="desk-eyebrow contact-social-title">{DESK.contact.social}</p>
      <div className="contact-links">
        {CONTACT.links.map((link) => (
          <a href={link.href} key={link.label} target="_blank" rel="noreferrer">
            {link.label}
            <Arrow diagonal />
          </a>
        ))}
      </div>
    </section>
  );
}

export function ResumeContent() {
  return (
    <section
      className="portfolio-section resume-section"
      aria-labelledby="resume-title"
    >
      <p className="desk-eyebrow">{DESK.resume.eyebrow}</p>
      <h2 id="resume-title">{DESK.resume.title}</h2>
      <p className="section-intro">{DESK.resume.intro}</p>
      <div className="resume-actions">
        <a
          className="desk-button"
          href={CONTACT.resumeHref}
          download="Devauntae_Norman_Resume.pdf"
        >
          {DESK.resume.download}
          <span aria-hidden="true">↓</span>
        </a>
        <a
          className="desk-text-link"
          href="/api/resume/file"
          target="_blank"
          rel="noreferrer"
        >
          {DESK.resume.view}
          <Arrow diagonal />
        </a>
      </div>
      <div className="resume-paper">
        <header>
          <span>{RESUME.name}</span>
          <p>{RESUME.tagline}</p>
          <small>
            {DESK.location} / {CONTACT.email}
          </small>
        </header>
        {RESUME.sections.map((section) => (
          <section key={section.heading}>
            <h3>{section.heading}</h3>
            {section.items.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </section>
        ))}
      </div>
      <div className="resume-footer">
        <span>{DESK.resume.note}</span>
        <a
          href="/docs/Devauntae_Norman_Cover_Letter.pdf"
          target="_blank"
          rel="noreferrer"
        >
          {DESK.resume.cover}
          <Arrow diagonal />
        </a>
      </div>
    </section>
  );
}

export function SectionContent({ section }: { section: Section }) {
  return section === "about" ? (
    <AboutContent idPrefix="computer-" />
  ) : section === "skills" ? (
    <SkillsContent idPrefix="computer-" />
  ) : section === "contact" ? (
    <ContactContent idPrefix="computer-" />
  ) : (
    <WorkContent idPrefix="computer-" />
  );
}
