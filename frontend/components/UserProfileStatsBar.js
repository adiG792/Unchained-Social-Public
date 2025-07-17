import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

export default function UserProfileStatsBar({ joined = '', posts = 0, soc = 0 }) {
  return (
    <Box
      sx={{
        background: 'rgba(255,255,255,0.35)',
        backdropFilter: 'blur(32px)',
        boxShadow: '0 8px 32px 0 rgba(31,38,135,0.10)',
        borderRadius: 4,
        border: '1.5px solid #fff',
        bgcolor: '#fdf6f0',
        px: 2,
        py: 1,
        my: 2,
        maxWidth: 600,
        mx: 'auto',
      }}
    >
      <Grid container justifyContent="center" spacing={4}>
        <Grid item>
          <Typography variant="body2" color="textSecondary">
            Joined {joined || 'nil'}
          </Typography>
        </Grid>
        <Grid item>
          <Typography variant="body2" color="textSecondary">
            {posts} posts
          </Typography>
        </Grid>
        <Grid item>
          <Typography variant="body2" color="textSecondary">
            {soc} SOC earned
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
} 