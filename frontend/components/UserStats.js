import React from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import LockIcon from '@mui/icons-material/Lock';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import IconButton from '@mui/material/IconButton';

const DEFAULT_AVATAR = 'https://via.placeholder.com/150/6366f1/ffffff?text=User';

export default function UserStats({
  avatarUrl = '',
  ens = '',
  username = '',
  bio = '',
  isFollowing = false,
  onFollow = () => {},
  onTip = () => {},
  onShare = () => {},
  hideActions = false,
  isOnline = false,
  onChangeAvatar = () => {},
}) {
  const hasENS = ens && ens.endsWith('.eth');
  return (
    <Box display="flex" justifyContent="center">
      <Box
        sx={{
          background: 'rgba(255,255,255,0.35)',
          backdropFilter: 'blur(32px)',
          boxShadow: '0 8px 32px 0 rgba(31,38,135,0.10)',
          borderRadius: 4,
          border: '1.5px solid #fff',
          bgcolor: '#fdf6f0',
          px: 4,
          py: 3,
          mt: 2,
          width: '100%',
          maxWidth: 600,
        }}
        display="flex"
        flexDirection="column"
        alignItems="center"
      >
        {/* Avatar with overlay */}
        <Box position="relative" mb={2}>
  
          <Avatar
            src={avatarUrl || DEFAULT_AVATAR}
            alt="avatar"
            sx={{ width: 112, height: 112, boxShadow: 3, border: '4px solid #fff', bgcolor: '#f5e7d6', fontSize: 48 }}
          >
            {/* No fallback letter, always show image like homepage */}
          </Avatar>
          {/* Add overlay icon (for upload, if needed) */}
          <Box position="absolute" bottom={0} right={0}>
            <IconButton onClick={onChangeAvatar} sx={{ bgcolor: '#fff', borderRadius: '50%' }} size="small">
              <AddCircleIcon sx={{ color: '#e48a3a', fontSize: 32 }} />
            </IconButton>
          </Box>
          {/* Status dot (online/offline) */}
          <Box position="absolute" bottom={8} left={8} display="flex" alignItems="center" justifyContent="center"
            sx={{ width: 22, height: 22, border: '2px solid #bdbdbd', borderRadius: '50%', bgcolor: '#fff' }}>
            <FiberManualRecordIcon sx={{ color: isOnline ? '#43a047' : '#bdbdbd', fontSize: 14 }} />
          </Box>
        </Box>
        {/* ENS/username and lock icon */}
        <Box display="flex" alignItems="center" gap={1} mt={1}>
          <LockIcon fontSize="small" sx={{ color: '#757575' }} />
          <Typography variant="h5" fontWeight={700} sx={{ fontFamily: 'Poppins, sans-serif' }}>
            {hasENS ? ens : username}
          </Typography>
        </Box>
        {/* Username below ENS if both exist */}
        {hasENS && username && (
          <Typography variant="subtitle1" color="#e48a3a" fontWeight={600}>
            {username.startsWith('@') ? username : `@${username}`}
          </Typography>
        )}
        {/* Bio */}
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 1, mb: 2, maxWidth: 320 }}>
          {bio}
        </Typography>
        {/* Action Buttons */}
        {!hideActions && (
          <Grid container spacing={2} justifyContent="center" sx={{ mb: 2 }}>
            <Grid item>
              <Button
                variant={isFollowing ? 'contained' : 'outlined'}
                color="warning"
                onClick={onFollow}
                sx={{ borderRadius: 8, minWidth: 120 }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                color="warning"
                onClick={onTip}
                sx={{ borderRadius: 8, minWidth: 120 }}
              >
                Tip 10 SOC
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                color="warning"
                onClick={onShare}
                sx={{ borderRadius: 8, minWidth: 120 }}
              >
                Share
              </Button>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
} 