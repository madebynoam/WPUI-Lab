'use client';

import { useComponentTree } from '@/contexts/ComponentTreeContext';
import { ProjectsScreen } from './ProjectsScreen';
import { useRouter } from 'next/navigation';

function ProjectsPageContent() {
  const router = useRouter();
  const {
    projects,
    createProject,
    setCurrentProject,
    deleteProject,
    renameProject,
    duplicateProject,
    resetExampleProject,
  } = useComponentTree();

  const handleCreateProject = (name: string) => {
    const projectId = createProject(name);
    // New projects always start with 'page-1' as the first page
    router.push(`/editor/${projectId}/page-1`);
  };

  const handleOpenProject = (projectId: string) => {
    setCurrentProject(projectId);
    // Find the project to get its current or first page
    const project = projects.find(p => p.id === projectId);
    const pageId = project?.currentPageId || project?.pages[0]?.id || 'page-1';
    router.push(`/editor/${projectId}/${pageId}`);
  };

  const handleDuplicateProject = (projectId: string) => {
    const newProjectId = duplicateProject(projectId);
    // Duplicated projects will have 'page-1' as the first page
    router.push(`/editor/${newProjectId}/page-1`);
  };

  return (
    <ProjectsScreen
      projects={projects}
      onCreateProject={handleCreateProject}
      onOpenProject={handleOpenProject}
      onDeleteProject={deleteProject}
      onRenameProject={renameProject}
      onDuplicateProject={handleDuplicateProject}
      onResetExampleProject={resetExampleProject}
    />
  );
}

export default function ProjectsPage() {
  return <ProjectsPageContent />;
}
