'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  __experimentalVStack as VStack,
  __experimentalHStack as HStack,
  __experimentalHeading as Heading,
  __experimentalText as Text,
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

interface ProjectBinRecord {
  metadata?: { id?: string };
  binId?: string;
  record?: {
    project?: { id?: string; name?: string; pages?: { id: string }[] };
    meta?: { lastSaved?: number };
  };
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
      const records = Array.isArray(data) ? data : [];
      const mapped = records.map((b: ProjectBinRecord) => ({
        binId: b.metadata?.id || b.binId || '',
        projectId: b.record?.project?.id || b.metadata?.id || b.binId || '',
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
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', padding: 40 }}>
      <VStack spacing={4} style={{ maxWidth: 800, margin: '0 auto' }}>
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

        {!initialLoadDone && (
          <Card size="medium">
            <CardBody size="small" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Spinner />
              <Text variant="muted" style={{ marginTop: 16 }}>Loading projects...</Text>
            </CardBody>
          </Card>
        )}

        {initialLoadDone && projects.map((project) => (
          <Card key={project.binId} size="medium">
            <CardBody size="small">
              <HStack
                spacing={6}
                style={{ justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => handleOpen(project)}
              >
                <HStack spacing={2} style={{ flex: 1, minWidth: 0 }}>
                  <Icon icon={pages} size={24} />
                  <VStack spacing={1} style={{ flex: 1, minWidth: 0 }}>
                    <Heading level={4} style={{ margin: 0 }}>{project.name}</Heading>
                    <Text variant="muted">{formatDate(project.lastSaved)}</Text>
                  </VStack>
                </HStack>

                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu icon={moreVertical} label="Project actions">
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

        {initialLoadDone && projects.length === 0 && (
          <Card size="medium">
            <CardBody size="small" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Text variant="muted">No projects yet</Text>
              <Text variant="muted" style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
                Create your first project to get started
              </Text>
            </CardBody>
          </Card>
        )}
      </VStack>

      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
};
