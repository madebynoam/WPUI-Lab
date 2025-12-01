import React, { useState } from 'react';
import {
  __experimentalVStack as VStack,
  __experimentalHStack as HStack,
  __experimentalHeading as Heading,
  __experimentalText as Text,
  __experimentalSpacer as Spacer,
  Button,
  Card,
  CardBody,
  Icon,
  DropdownMenu,
  MenuGroup,
  MenuItem,
} from '@wordpress/components';
import { moreVertical, trash, pencil, copy, pages, plus } from '@wordpress/icons';
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
    return `Created ${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;
  };

  return (
    <>
      <VStack spacing={12} style={{ padding: '40px', maxWidth: '1440px', margin: '0 auto', minHeight: '100vh' }}>
        <VStack spacing={2} style={{ width: '100%', alignItems: 'center' }}>
          <VStack spacing={2} style={{ width: '100%', maxWidth: '800px' }}>
            {/* Header */}
            <HStack spacing={2}>
              <Heading level={4}>Your projects</Heading>
              <Button
                variant="secondary"
                icon={plus}
                size="compact"
                onClick={() => setShowNewProjectModal(true)}
              >
                New project
              </Button>
            </HStack>

            <Spacer margin={0} />

            {/* Projects List */}
            {projects.map((project) => (
              <Card key={project.id} size="medium">
                <CardBody size="small">
                  {renamingProjectId === project.id ? (
                    // Rename mode
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                          fontSize: '14px',
                          border: '1px solid #3858e9',
                          borderRadius: '4px',
                          outline: 'none',
                        }}
                      />
                      <Button
                        variant="primary"
                        size="compact"
                        onClick={() => handleRenameSubmit(project.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="compact"
                        onClick={handleRenameCancel}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    // Normal mode
                    <HStack
                      spacing={6}
                      style={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => onOpenProject(project.id)}
                    >
                      <HStack spacing={2} style={{ alignItems: 'flex-start', flex: 0 }}>
                        <Icon icon={pages} size={24} />
                        <VStack spacing={1}>
                          <Heading level={4}>{project.name}</Heading>
                          <Text variant="muted">
                            {project.description || formatDate(project.createdAt || project.lastModified)}
                          </Text>
                        </VStack>
                      </HStack>

                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          icon={moreVertical}
                          label="Project actions"
                        >
                          {() => (
                            <MenuGroup>
                              <MenuItem
                                icon={pencil}
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
                    </HStack>
                  )}
                </CardBody>
              </Card>
            ))}

            {/* Empty state */}
            {projects.length === 0 && (
              <Card size="medium">
                <CardBody size="small" style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Text variant="muted">No projects yet</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Text variant="muted" style={{ fontSize: '13px', color: '#999' }}>
                      Create your first project to get started
                    </Text>
                  </div>
                </CardBody>
              </Card>
            )}
          </VStack>
        </VStack>
      </VStack>

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
    </>
  );
};
