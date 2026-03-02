import './AboutSettings.scss';

const TECH_STACK = [
  'React',
  'TypeScript',
  'MobX',
  'React Query',
  'Vite',
  'SCSS',
  'Bun',
  'Elysia',
  'SQLite',
];

export function AboutSettings() {
  return (
    <div className="AboutSettings">
      <div className="AboutSettings__header">
        <h2 className="AboutSettings__name">Knowledge Graph</h2>
        <span className="AboutSettings__version">v0.1.0-alpha</span>
      </div>

      <p className="AboutSettings__description">
        A collaborative knowledge management system with agent-powered editing,
        semantic graph visualization, and Git-like version control for
        specifications.
      </p>

      <div className="AboutSettings__section">
        <h3 className="AboutSettings__sectionTitle">Tech Stack</h3>
        <ul className="AboutSettings__techList">
          {TECH_STACK.map((tech) => (
            <li key={tech} className="AboutSettings__techItem">
              {tech}
            </li>
          ))}
        </ul>
      </div>

      <div className="AboutSettings__section">
        <h3 className="AboutSettings__sectionTitle">Links</h3>
        <div className="AboutSettings__links">
          <a
            className="AboutSettings__link"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Repository
          </a>
          <a
            className="AboutSettings__link"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
          <a
            className="AboutSettings__link"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Report an Issue
          </a>
        </div>
      </div>
    </div>
  );
}
