import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  Box, 
  IconButton, 
  Typography, 
  LinearProgress,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { ethers } from 'ethers';
import PostContractAbi from '../abis/PostContract.json';
import contracts from '../src/contracts.json';
import { validateAvatarUrl } from '../utils/getUserStats';

export default function StoryModal({ open, onClose, stories, initialStoryIndex = 0, initialUserIndex = 0, allUserKeys = [], currentAccount = '' }) {
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  

  const [progress, setProgress] = useState(0);
  const [usernames, setUsernames] = useState({});
  const [viewedStories, setViewedStories] = useState(new Set());
  const [avatarUrl, setAvatarUrl] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [account, setAccount] = useState(currentAccount);
  const progressRef = useRef(null);
  const autoAdvanceRef = useRef(null);
  const startTimeRef = useRef(null);

  // Group stories by user
  const storiesByUser = (stories || []).reduce((acc, story) => {
    const userKey = story.address.toLowerCase();
    if (!acc[userKey]) {
      acc[userKey] = [];
    }
    acc[userKey].push(story);
    return acc;
  }, {});

  // Use allUserKeys if provided, otherwise fall back to userKeys from stories
  const userKeys = allUserKeys.length > 0 ? allUserKeys : Object.keys(storiesByUser);
  const currentUserKey = userKeys[currentUserIndex] || userKeys[0];
  const currentUserStories = storiesByUser[currentUserKey] || [];
  const currentStory = currentUserStories[currentStoryIndex] || currentUserStories[0];
  


  // Reset currentUserIndex if it's out of bounds
  useEffect(() => {
    if (userKeys.length > 0 && currentUserIndex >= userKeys.length) {
      setCurrentUserIndex(0);
    }
  }, [userKeys, currentUserIndex]);

  // Update currentUserIndex when modal opens or initialUserIndex changes
  useEffect(() => {
    if (open && initialUserIndex >= 0 && initialUserIndex < userKeys.length) {
      setCurrentUserIndex(initialUserIndex);
      setCurrentStoryIndex(initialStoryIndex);
    }
  }, [open, initialUserIndex, initialStoryIndex, userKeys.length]);

  // Update account when currentAccount prop changes
  useEffect(() => {
    if (currentAccount) {
      setAccount(currentAccount.toLowerCase());
    }
  }, [currentAccount]);

  // Load avatar from localStorage (like profile page)
  useEffect(() => {
    if (currentUserKey) {
      const key = `avatar_${currentUserKey.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const validatedUrl = validateAvatarUrl(stored, currentUserKey);
        setAvatarUrl(validatedUrl);
        // Update localStorage with corrected URL if needed
        if (validatedUrl && validatedUrl !== stored) {
          localStorage.setItem(key, validatedUrl);
        }
      } else {
        setAvatarUrl('');
      }
    }
  }, [currentUserKey]);

  // Fetch usernames
  useEffect(() => {
    async function fetchUsernames() {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contracts.PostContract, PostContractAbi.abi, provider);
      const nameMap = {};
      
      for (const userKey of userKeys) {
        try {
          const uname = await contract.usernames(userKey);
          nameMap[userKey] = uname;
        } catch {}
      }
      setUsernames(nameMap);
    }
    if (userKeys.length > 0) fetchUsernames();
  }, [userKeys]);

  // Auto-advance timer
  useEffect(() => {
    if (!open || !currentStory) return;

    setProgress(0);
    startTimeRef.current = Date.now();
    const duration = 30000; // 30 seconds

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        // Mark current story as viewed before moving to next
        markStoryAsViewed();
        handleNext();
      } else {
        autoAdvanceRef.current = setTimeout(updateProgress, 100);
      }
    };

    autoAdvanceRef.current = setTimeout(updateProgress, 100);

    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    };
  }, [open, currentUserIndex, currentStoryIndex, currentStory]);

  // Mark story as viewed when auto-advance completes or user navigates
  const markStoryAsViewed = () => {
    if (currentStory && currentAccount) {
      setViewedStories(prev => new Set([...prev, currentStory.id]));
      
      // Update backend for cross-device sync
      fetch('/api/storyViews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: currentAccount.toLowerCase(),
          storyId: currentStory.id
        })
      }).catch(error => {
        console.error('Error marking story as viewed:', error);
      });
    }
  };

  const handleNext = () => {
    // Mark current story as viewed before navigating
    markStoryAsViewed();
    
    if (currentStoryIndex < currentUserStories.length - 1) {
      // Next story for same user
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentUserIndex < userKeys.length - 1) {
      // Next user
      setCurrentUserIndex(currentUserIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      // End of all stories
      onClose();
    }
  };

  const handlePrevious = () => {
    // Mark current story as viewed before navigating
    markStoryAsViewed();
    
    if (currentStoryIndex > 0) {
      // Previous story for same user
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentUserIndex > 0) {
      // Previous user
      setCurrentUserIndex(currentUserIndex - 1);
      const prevUserStories = storiesByUser[userKeys[currentUserIndex - 1]] || [];
      setCurrentStoryIndex(prevUserStories.length - 1);
    }
  };

  const handleUserClick = (userIndex) => {
    // Mark current story as viewed before navigating
    markStoryAsViewed();
    
    setCurrentUserIndex(userIndex);
    setCurrentStoryIndex(0);
  };

  const handleStoryClick = (userIndex, storyIndex) => {
    // Mark current story as viewed before navigating
    markStoryAsViewed();
    
    setCurrentUserIndex(userIndex);
    setCurrentStoryIndex(storyIndex);
  };

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleClose = () => {
    // Mark current story as viewed when closing modal
    markStoryAsViewed();
    onClose();
  };

  const handleDeleteStory = async () => {
    if (!currentStory || !account) return;
    
    // Only allow deletion if it's the user's own story
    if (currentStory.address.toLowerCase() !== account.toLowerCase()) {
      return;
    }

    try {
      const response = await fetch('/api/deleteStory', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: currentStory.address,
          filename: currentStory.filename
        })
      });

      if (response.ok) {
        const result = await response.json();

        
        // Close modal and refresh stories
        onClose();
        // Trigger a refresh of stories in the parent component
        window.dispatchEvent(new CustomEvent('story-deleted'));
      } else {
        const errorData = await response.json();
        console.error('Failed to delete story:', errorData);
        // You could add a toast notification here for better UX
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      // You could add a toast notification here for better UX
    }
    
    handleMenuClose();
  };

  if (!stories || stories.length === 0 || !currentStory) return null;

  const currentUsername = usernames[currentUserKey] || currentUserKey.slice(0, 6) + '...' + currentUserKey.slice(-4);
  const isViewed = viewedStories.has(currentStory.id);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '400px',
          height: '600px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <Box sx={{ 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(0,0,0,0.8)',
        borderRadius: 3
      }}>
        {/* Header with user info and progress bars */}
        <Box sx={{ 
          position: 'relative',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.3))',
          p: 2,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Progress bars for current user's stories */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {currentUserStories.map((story, index) => (
              <Box
                key={story.id}
                sx={{
                  flex: 1,
                  height: 3,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #e48a3a, #f7a76c)',
                    width: `${index < currentStoryIndex ? 100 : index === currentStoryIndex ? progress : 0}%`,
                    transition: 'width 0.1s linear',
                    borderRadius: 2
                  }}
                />
              </Box>
            ))}
          </Box>

          {/* User info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={avatarUrl}
                sx={{ 
                  width: 40, 
                  height: 40,
                  mr: 2,
                  bgcolor: '#6366f1',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <Avatar
                sx={{ 
                  width: 40, 
                  height: 40,
                  mr: 2,
                  bgcolor: '#6366f1',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              >
                {usernames[currentUserKey]?.charAt(0).toUpperCase() || currentUserKey?.charAt(0).toUpperCase()}
              </Avatar>
            </Box>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {currentUsername}
            </Typography>
            <Chip 
              label={`${currentStoryIndex + 1}/${currentUserStories.length}`}
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            />
            <IconButton 
              onClick={handleClose} 
              sx={{ 
                ml: 'auto', 
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.2)'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
            {/* Three-dot menu for own stories */}
            {currentStory.address.toLowerCase() === account.toLowerCase() && (
              <IconButton 
                onClick={handleMenuOpen} 
                sx={{ 
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.2)'
                  }
                }}
              >
                <MoreVertIcon />
            </IconButton>
          )}
          </Box>
        </Box>

        {/* Menu for story actions */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              bgcolor: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 2,
              boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)'
            }
          }}
        >
          <MenuItem onClick={handleDeleteStory} sx={{ color: '#d32f2f' }}>
            <ListItemIcon>
              <DeleteIcon sx={{ color: '#d32f2f' }} />
            </ListItemIcon>
            <ListItemText>Delete Story</ListItemText>
          </MenuItem>
        </Menu>

        {/* Story content */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          p: 2
        }}>
          {currentStory.type === 'video' ? (
            <video
              src={currentStory.mediaUrl}
              controls
              autoPlay
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="story"
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
          )}
        </Box>

        {/* Navigation buttons */}
        <Box sx={{ 
          position: 'absolute', 
          top: '50%', 
          left: 0, 
          right: 0, 
          transform: 'translateY(-50%)',
          display: 'flex',
          justifyContent: 'space-between',
          px: 2,
          pointerEvents: 'none'
        }}>
          <IconButton
            onClick={handlePrevious}
            disabled={currentUserIndex === 0 && currentStoryIndex === 0}
            sx={{ 
              color: 'white', 
              bgcolor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              pointerEvents: 'auto',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
              '&:disabled': { opacity: 0.5 }
            }}
          >
            <NavigateBeforeIcon />
          </IconButton>
          <IconButton
            onClick={handleNext}
            sx={{ 
              color: 'white', 
              bgcolor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              pointerEvents: 'auto',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
            }}
          >
            <NavigateNextIcon />
          </IconButton>
        </Box>

        {/* User stories bar at bottom */}
        <Box sx={{ 
          position: 'relative',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.3))',
          p: 2,
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
            {userKeys.map((userKey, userIndex) => {
              const userStories = storiesByUser[userKey] || [];
              const hasUnviewed = userStories.some(story => !viewedStories.has(story.id));
              const isCurrentUser = userIndex === currentUserIndex;
              const username = usernames[userKey] || userKey.slice(0, 6) + '...' + userKey.slice(-4);

              return (
                <Box
                  key={userKey}
                  onClick={() => handleUserClick(userIndex)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    opacity: isCurrentUser ? 1 : 0.7,
                    transition: 'opacity 0.2s',
                    p: 1,
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(10px)'
                    }
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      src={validateAvatarUrl(localStorage.getItem(`avatar_${userKey.toLowerCase()}`), userKey)}
                      sx={{ 
                        width: 48, 
                        height: 48, 
                        border: hasUnviewed ? '3px solid #e48a3a' : '3px solid rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.parentElement.querySelector('[data-fallback]');
                        if (fallback) {
                          fallback.style.display = 'flex';
                        }
                      }}
                    />
                    <Avatar
                      data-fallback="true"
                      sx={{
                        width: 48,
                        height: 48,
                        border: hasUnviewed ? '3px solid #e48a3a' : '3px solid rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        display: 'none',
                        bgcolor: '#6366f1',
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      {userKey.charAt(0).toUpperCase()}
                    </Avatar>
                    {hasUnviewed && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 12,
                          height: 12,
                          bgcolor: '#e48a3a',
                          borderRadius: '50%',
                          border: '2px solid white',
                          backdropFilter: 'blur(10px)'
                        }}
                      />
                    )}
                  </Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'white', 
                      fontSize: '10px',
                      maxWidth: 60,
                      textAlign: 'center',
                      mt: 0.5,
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    {username}
          </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
} 