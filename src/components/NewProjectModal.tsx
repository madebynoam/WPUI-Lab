'use client';

import React, { useState } from 'react';
import {
  Modal,
  Button,
  TextControl,
  TextareaControl,
  __experimentalVStack as VStack,
} from '@wordpress/components';

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose, onCreate }) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const handleCreate = () => {
    if (projectName.trim()) {
      onCreate(projectName.trim(), projectDescription.trim() || undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only submit on Enter if we're in the name field (not textarea)
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      handleCreate();
    }
  };

  return (
    <Modal
      title="Create New Project"
      onRequestClose={onClose}
      style={{ maxWidth: '500px' }}
    >
      <VStack spacing={4}>
        <TextControl
          label="Project Name"
          value={projectName}
          onChange={setProjectName}
          onKeyDown={handleKeyDown}
          placeholder="My Awesome Project"
          autoFocus
        />

        <TextareaControl
          label="Description (optional)"
          value={projectDescription}
          onChange={setProjectDescription}
          placeholder="What is this project about?"
          rows={3}
        />

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!projectName.trim()}
          >
            Create
          </Button>
        </div>
      </VStack>
    </Modal>
  );
};
