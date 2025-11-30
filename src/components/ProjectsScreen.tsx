import React, { useState } from 'react';
import {
  __experimentalVStack as VStack,
  __experimentalHStack as HStack,
  __experimentalHeading as Heading,
  Button,
  Card,
  CardBody,
  CardHeader,
  DropdownMenu,
  MenuGroup,
  MenuItem,
} from '@wordpress/components';
import { moreVertical, trash, edit, copy } from '@wordpress/icons';
import { Project } from '../types';
import { NewProjectModal } from './NewProjectModal';

interface ProjectsScreenProps {
  projects: Project[];
  onCreateProject: (name: string) => void;
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, name: string) => void;
  onDuplicateProject: (projectId: string) => void;
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  projects,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
  onRenameProject,
  onDuplicateProject,
}) => {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleRenameStart = (project: Project) => {
    setRenamingProjectId(project.id);
    setRenameValue(project.name);
  };

  const handleRenameSubmit = (projectId: string) => {
    if (renameValue.trim()) {
      onRenameProject(projectId, renameValue.trim());
    }
    setRenamingProjectId(null);
    setRenameValue('');
  };

  const handleRenameCancel = () => {
    setRenamingProjectId(null);
    setRenameValue('');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f0f0f1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <VStack spacing={6}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Heading level={1} style={{ fontSize: '36px', marginBottom: '8px' }}>
              WP Designer
            </Heading>
            <Heading level={2} style={{ fontSize: '18px', fontWeight: 400, color: '#757575' }}>
              Projects
            </Heading>
          </div>

          {/* New Project Button */}
          <Button
            variant="primary"
            onClick={() => setShowNewProjectModal(true)}
            style={{ width: '100%', padding: '12px', fontSize: '16px' }}
          >
            Create New Project
          </Button>

          {/* Projects List */}
          {projects.length > 0 ? (
            <Card style={{ marginTop: '20px' }}>
              <CardBody style={{ padding: 0 }}>
                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    style={{
                      borderBottom: index < projects.length - 1 ? '1px solid #e0e0e0' : 'none',
                    }}
                  >
                    {renamingProjectId === project.id ? (
                      // Rename mode
                      <div style={{ padding: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(project.id);
                            if (e.key === 'Escape') handleRenameCancel();
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: '16px',
                            border: '1px solid #3858e9',
                            borderRadius: '4px',
                            outline: 'none',
                          }}
                        />
                        <Button
                          variant="primary"
                          onClick={() => handleRenameSubmit(project.id)}
                          style={{ padding: '8px 16px' }}
                        >
                          Save
                        </Button>
                        <Button
                          onClick={handleRenameCancel}
                          style={{ padding: '8px 16px' }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      // Normal mode
                      <div
                        style={{
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        }}
                        onClick={() => onOpenProject(project.id)}
                      >
                        {/* Project Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '4px' }}>
                            {project.name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#757575' }}>
                            {project.pages.length} page{project.pages.length !== 1 ? 's' : ''} · Last modified {formatDate(project.lastModified)}
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu
                            icon={moreVertical}
                            label="Project actions"
                          >
                            {() => (
                              <MenuGroup>
                                <MenuItem
                                  icon={edit}
                                  onClick={() => handleRenameStart(project)}
                                >
                                  Rename
                                </MenuItem>
                                <MenuItem
                                  icon={copy}
                                  onClick={() => onDuplicateProject(project.id)}
                                >
                                  Duplicate
                                </MenuItem>
                                <MenuItem
                                  icon={trash}
                                  onClick={() => {
                                    if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                                      onDeleteProject(project.id);
                                    }
                                  }}
                                  isDestructive
                                  disabled={projects.length === 1}
                                >
                                  Delete
                                </MenuItem>
                              </MenuGroup>
                            )}
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : (
            // Empty state
            <Card style={{ marginTop: '20px' }}>
              <CardBody style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '16px', color: '#757575', marginBottom: '16px' }}>
                  No projects yet
                </div>
                <div style={{ fontSize: '14px', color: '#999' }}>
                  Create your first project to get started
                </div>
              </CardBody>
            </Card>
          )}
        </VStack>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreate={(name) => {
            onCreateProject(name);
            setShowNewProjectModal(false);
          }}
        />
      )}
    </div>
  );
};
