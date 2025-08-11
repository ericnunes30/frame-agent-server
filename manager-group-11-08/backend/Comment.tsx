
import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';

interface CommentProps {
  comment: {
    author: string;
    text: string;
    avatarUrl?: string;
  };
}

const Comment: React.FC<CommentProps> = ({ comment }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
      <Avatar src={comment.avatarUrl} sx={{ mr: 2 }} />
      <Box>
        <Typography variant="subtitle2" component="div">
          {comment.author}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ wordWrap: 'break-word' }}>
          {comment.text}
        </Typography>
      </Box>
    </Box>
  );
};

export default Comment;
