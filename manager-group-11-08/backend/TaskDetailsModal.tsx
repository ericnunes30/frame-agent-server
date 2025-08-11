
import React from 'react';
import { Modal, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  task: {
    title: string;
    description: string;
    link: string;
  };
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ open, onClose, task }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
        }}
      >
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" component="h2">
          {task.title}
        </Typography>
        <Typography sx={{ mt: 2, wordWrap: 'break-word' }}>
          {task.description}
        </Typography>
        <Typography sx={{ mt: 2, wordWrap: 'break-word' }}>
          <a href={task.link} target="_blank" rel="noopener noreferrer">
            {task.link}
          </a>
        </Typography>
      </Box>
    </Modal>
  );
};

export default TaskDetailsModal;
