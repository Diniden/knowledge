import './GenUiProjectList.scss';

export interface GenUiProjectListProps {
  projects: Array<{
    id: string;
    name: string;
    description: string;
    status: 'building' | 'ready' | 'error';
    createdAt: string;
  }>;
  onSelect: (id: string) => void;
  onBuild: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  building: 'Building',
  ready: 'Ready',
  error: 'Error',
};

export function GenUiProjectList({
  projects,
  onSelect,
  onBuild,
  onDelete,
}: GenUiProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="GenUiProjectList GenUiProjectList--empty">
        <p>No generated UI projects yet.</p>
        <p>Projects created by the agent will appear here.</p>
      </div>
    );
  }

  return (
    <div className="GenUiProjectList">
      <div className="GenUiProjectList__grid">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`GenUiProjectList__card GenUiProjectList__card--${project.status}`}
            onClick={() => onSelect(project.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(project.id);
              }
            }}
          >
            <div className="GenUiProjectList__cardHeader">
              <span className="GenUiProjectList__name">{project.name}</span>
              <span
                className={`GenUiProjectList__status GenUiProjectList__status--${project.status}`}
              >
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
            </div>

            <p className="GenUiProjectList__description">
              {project.description}
            </p>

            <div className="GenUiProjectList__footer">
              <span className="GenUiProjectList__date">
                {new Date(project.createdAt).toLocaleDateString()}
              </span>
              <div className="GenUiProjectList__actions">
                <button
                  className="GenUiProjectList__btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBuild(project.id);
                  }}
                  disabled={project.status === 'building'}
                >
                  Build
                </button>
                <button
                  className="GenUiProjectList__btn GenUiProjectList__btn--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
