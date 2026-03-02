import { useState, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { GenUiProjectList, GenUiViewer } from '../features/genui/index.js';
import './GenUiPage.scss';

interface MockProject {
  id: string;
  name: string;
  description: string;
  status: 'building' | 'ready' | 'error';
  bundleUrl: string;
  createdAt: string;
}

const MOCK_PROJECTS: MockProject[] = [
  {
    id: 'genui-demo-1',
    name: 'Requirements Survey',
    description:
      'Interactive form for capturing project requirements with guided questions and validation.',
    status: 'ready',
    bundleUrl: '/api/gen-ui/projects/genui-demo-1/bundle',
    createdAt: '2026-02-20T10:00:00Z',
  },
  {
    id: 'genui-demo-2',
    name: 'Spec Relationship Graph',
    description:
      'Visual readout showing how specs relate to each other within a document hierarchy.',
    status: 'ready',
    bundleUrl: '/api/gen-ui/projects/genui-demo-2/bundle',
    createdAt: '2026-02-22T14:30:00Z',
  },
  {
    id: 'genui-demo-3',
    name: 'Animation Builder',
    description:
      'Custom tool for designing animation sequences with timeline and preview.',
    status: 'error',
    bundleUrl: '/api/gen-ui/projects/genui-demo-3/bundle',
    createdAt: '2026-02-25T09:15:00Z',
  },
];

export function GenUiPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [projects, setProjects] = useState<MockProject[]>(MOCK_PROJECTS);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleSelect = useCallback((id: string) => {
    setSelectedProjectId(id);
  }, []);

  const handleBuild = useCallback((id: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: 'building' as const } : p,
      ),
    );

    setTimeout(() => {
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'ready' as const } : p)),
      );
    }, 2000);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
      }
    },
    [selectedProjectId],
  );

  const handleClose = useCallback(() => {
    setSelectedProjectId(null);
  }, []);

  const handleRefresh = useCallback(() => {
    if (!selectedProjectId) return;
    setSelectedProjectId(null);
    requestAnimationFrame(() => {
      setSelectedProjectId(selectedProjectId);
    });
  }, [selectedProjectId]);

  return (
    <AppLayout>
      <div className="GenUiPage">
        <div className="GenUiPage__header">
          <h1 className="GenUiPage__title">Generated UI</h1>
          <p className="GenUiPage__subtitle">
            Agent-created interactive components and tools
          </p>
        </div>

        {selectedProject ? (
          <div className="GenUiPage__viewer">
            <GenUiViewer
              project={selectedProject}
              onClose={handleClose}
              onRefresh={handleRefresh}
            />
          </div>
        ) : (
          <div className="GenUiPage__list">
            <GenUiProjectList
              projects={projects}
              onSelect={handleSelect}
              onBuild={handleBuild}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
