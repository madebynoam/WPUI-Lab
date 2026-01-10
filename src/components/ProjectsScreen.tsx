'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Spinner,
} from '@wordpress/components';
import { moreVertical, trash, pages, plus } from '@wordpress/icons';
import { useCloudProject } from '@/hooks/useCloudProject';
import { useAuth } from '@/hooks/useAuth';
import { NewProjectModal } from './NewProjectModal';

interface CloudProject {
  binId: string;
  projectId: string;
  pageId: string;
  name: string;
  lastSaved: number;
}

export const ProjectsScreen: React.FC = () => {
  const router = useRouter();
  const { email } = useAuth();
  const { listProjects, createProject, deleteProject } = useCloudProject();
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    listProjects(email || undefined).then(data => {
      const mapped = (Array.isArray(data) ? data : []).map((b: any) => ({
        binId: b.metadata?.id || b.binId,
        projectId: b.record?.project?.id || b.metadata?.id || b.binId,
        pageId: b.record?.project?.pages?.[0]?.id || 'page-1',
        name: b.record?.project?.name || 'Untitled',
        lastSaved: b.record?.meta?.lastSaved || Date.now(),
      }));
      setProjects(mapped);
      setInitialLoadDone(true);
    });
  }, [listProjects, email]);

  const handleCreate = async (name: string, description?: string) => {
    const result = await createProject(name, email || undefined, description);
    if (result?.binId && result?.project) {
      const pageId = result.project.pages[0]?.id || 'page-1';
      router.push(`/editor/${result.binId}/${pageId}`);
    }
    setShowNewProjectModal(false);
  };

  const handleOpen = (project: CloudProject) => {
    router.push(`/editor/${project.binId}/${project.pageId}`);
  };

  const handleDelete = async (binId: string, name: string) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      await deleteProject(binId);
      setProjects(projects.filter(p => p.binId !== binId));
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `Last saved ${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;
  };

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <VStack spacing={12} style={{ padding: '40px', maxWidth: '1440px', margin: '0 auto' }}>
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

            {/* Loading state */}
            {!initialLoadDone && (
              <Card size="medium">
                <CardBody size="small" style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Spinner />
                  <Text variant="muted" style={{ marginTop: 16 }}>Loading projects...</Text>
                </CardBody>
              </Card>
            )}

            {/* Projects List */}
            {initialLoadDone && projects.map((project) => (
              <Card key={project.binId} size="medium">
                <CardBody size="small">
                  <HStack
                    spacing={6}
                    style={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleOpen(project)}
                  >
                    <HStack spacing={2} style={{ alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                      <Icon icon={pages} size={24} />
                      <VStack spacing={1} style={{ flex: 1, minWidth: 0 }}>
                        <Heading level={4} style={{ margin: 0 }}>{project.name}</Heading>
                        <Text variant="muted">
                          {formatDate(project.lastSaved)}
                        </Text>
                      </VStack>
                    </HStack>

                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu
                        icon={moreVertical}
                        label="Project actions"
                      >
                        {({ onClose }) => (
                          <MenuGroup>
                            <MenuItem
                              icon={trash}
                              onClick={() => {
                                handleDelete(project.binId, project.name);
                                onClose();
                              }}
                              isDestructive
                            >
                              Delete
                            </MenuItem>
                          </MenuGroup>
                        )}
                      </DropdownMenu>
                    </div>
                  </HStack>
                </CardBody>
              </Card>
            ))}

            {/* Empty state */}
            {initialLoadDone && projects.length === 0 && (
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
          onCreate={handleCreate}
        />
      )}
    </div>
  );
};
