import React, { useState } from 'react';
import {
  Modal,
  Button,
  TextControl,
  __experimentalVStack as VStack,
} from '@wordpress/components';

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose, onCreate }) => {
  const [projectName, setProjectName] = useState('');

  const handleCreate = () => {
    if (projectName.trim()) {
      onCreate(projectName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
