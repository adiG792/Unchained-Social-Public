import React, { useState, useEffect } from 'react';
import { Box, Avatar, Typography, IconButton, Dialog, DialogTitle, DialogContent, Button, LinearProgress, Chip } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { ethers } from 'ethers';
import PostContractAbi from '../abis/PostContract.json';
import contracts from '../src/contracts.json';
import StoryModal from './StoryModal';
import { validateAvatarUrl, getAvatarUrl } from '../utils/getUserStats';

export default function StoryBar({ account, onStoryClick }) {
  const [stories, setStories] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [viewedStories, setViewedStories] = useState(new Set());
  const [avatarUrl, setAvatarUrl] = useState('');

  // Load viewed stories from backend (account-specific)
  useEffect(() => {
    if (!account) {
      // Reset viewed stories when no account is available
      setViewedStories(new Set());
      return;
    }
    
    fetch(`/api/storyViews?account=${account.toLowerCase()}`)
      .then(res => res.json())
      .then(viewedStoriesArray => {
        setViewedStories(new Set(viewedStoriesArray));
      })
      .catch(error => {
        console.error('Error loading viewed stories:', error);
        setViewedStories(new Set());
      });
  }, [account]);

  // Fetch following list
  useEffect(() => {
    async function fetchFollowing() {
      if (!account || !window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contracts.PostContract, PostContractAbi.abi, provider);
        const followingList = await contract.getFollowing(account);
        const followingLower = followingList.map(addr => addr.toLowerCase());

        setFollowing(followingLower);
      } catch (error) {
        console.error('Error fetching following:', error);
        setFollowing([]);
      }
    }
    fetchFollowing();
  }, [account]);

  // Fetch stories
  useEffect(() => {
    fetch('/api/stories')
      .then(res => res.json())
      .then(setStories);
  }, []);



  // Listen for story deletion events
  useEffect(() => {
    const handleStoryDeleted = () => {
      fetch('/api/stories')
        .then(res => res.json())
        .then(setStories);
    };

    const handleStoryAdded = () => {
      fetch('/api/stories')
        .then(res => res.json())
        .then(newStories => {
          setStories(newStories);
          
          // When new stories are added, we need to check if any new stories
          // from other users should reset their viewed status
          const currentStoryIds = new Set(stories.map(story => story.id));
          const newStoryIds = new Set(newStories.map(story => story.id));
          
          // Find new stories that weren't in the previous list
          const addedStoryIds = [...newStoryIds].filter(id => !currentStoryIds.has(id));
          
          if (addedStoryIds.length > 0 && account) {
            // Get the new stories that were added
            const addedStories = newStories.filter(story => addedStoryIds.includes(story.id));
            
            // For each new story from other users, remove it from viewed stories in the backend
            // to trigger the orange circle
            addedStories.forEach(story => {
              if (story.address.toLowerCase() !== account.toLowerCase()) {
                // Remove from backend viewed stories to make it unviewed
                fetch(`/api/storyViews?account=${account.toLowerCase()}&storyId=${story.id}`, {
                  method: 'DELETE'
                }).catch(error => {
                  console.error('Error removing story from viewed:', error);
                });
              }
            });
            
            // Reload viewed stories from backend to reflect changes
            fetch(`/api/storyViews?account=${account.toLowerCase()}`)
              .then(res => res.json())
              .then(viewedStoriesArray => {
                setViewedStories(new Set(viewedStoriesArray));
              })
              .catch(error => {
                console.error('Error reloading viewed stories:', error);
              });
          }
        });
    };

    window.addEventListener('story-deleted', handleStoryDeleted);
    window.addEventListener('story-added', handleStoryAdded);
    return () => {
      window.removeEventListener('story-deleted', handleStoryDeleted);
      window.removeEventListener('story-added', handleStoryAdded);
    };
  }, [stories, viewedStories, account]);

  // Fetch usernames for each story address
  useEffect(() => {
    async function fetchUsernames() {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contracts.PostContract, PostContractAbi.abi, provider);
      const addresses = Array.from(new Set(stories.map(s => s.address.toLowerCase())));
      const nameMap = {};
      for (const addr of addresses) {
        try {
          const uname = await contract.usernames(addr);
          nameMap[addr] = uname;
        } catch {}
      }
      setUsernames(nameMap);
    }
    if (stories.length > 0) fetchUsernames();
  }, [stories]);

  // Load avatar from localStorage (like profile page)
  useEffect(() => {
    if (account) {
      const key = `avatar_${account.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const validatedUrl = validateAvatarUrl(stored, account);
        setAvatarUrl(validatedUrl);
        // Update localStorage with corrected URL if needed
        if (validatedUrl && validatedUrl !== stored) {
          localStorage.setItem(key, validatedUrl);
        }
      } else {
        setAvatarUrl('');
      }
    }
  }, [account]);

  // Helper function to get avatar URL for any user (like profile page)
  const getUserAvatarUrl = (userAddress) => {
    if (!userAddress) return '';
    const key = `avatar_${userAddress.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return validateAvatarUrl(stored, userAddress);
    }
    return '';
  };

  // Temporarily show all stories for debugging
  const filteredStories = stories.filter(story => {
    const addr = story.address.toLowerCase();
    const isFollowed = following.includes(addr);
    const isSelf = addr === account?.toLowerCase();
    

    
    // Temporarily show all stories to debug
    return true; // Show all stories for now
    // return isFollowed || isSelf; // Include followed users AND self
  });

  // Group stories by user, but exclude current user from regular story bubbles
  const storiesByUser = filteredStories.reduce((acc, story) => {
    const userKey = story.address.toLowerCase();
    // Skip adding current user to regular story bubbles since they have their own "My Story" bubble
    if (userKey === account?.toLowerCase()) {
      return acc;
    }
    if (!acc[userKey]) {
      acc[userKey] = [];
    }
    acc[userKey].push(story);
    return acc;
  }, {});

  // Create userKeys array that includes current user for navigation purposes
  const userKeys = Object.keys(storiesByUser);


  const allUserKeys = [...userKeys];
  
  // Add current user to the beginning of allUserKeys if they have stories
  if (account) {
    const myStories = stories.filter(story => 
      story.address.toLowerCase() === account.toLowerCase()
    );
    if (myStories.length > 0 && !allUserKeys.includes(account.toLowerCase())) {
      allUserKeys.unshift(account.toLowerCase());
    }
  }

  const handleStoryClick = (userKey, storyIndex = 0) => {
    // Find the user index in allUserKeys (which includes all users)
    const userIndex = allUserKeys.indexOf(userKey);
    if (userIndex !== -1) {
      setSelectedStoryIndex(userIndex);
      setStoryModalOpen(true);
      
      // Mark all stories from this user as viewed for the current account
      const userStories = storiesByUser[userKey] || [];
      userStories.forEach(story => {
        fetch('/api/storyViews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account: account.toLowerCase(),
            storyId: story.id
          })
        }).catch(error => {
          console.error('Error marking story as viewed:', error);
        });
      });
      
      // Update local state
      const newViewedStories = new Set([...viewedStories]);
      userStories.forEach(story => {
        newViewedStories.add(story.id);
      });
      setViewedStories(newViewedStories);
    }
  };

  const handleMyStoryClick = () => {
    // Get my own stories
    const myStories = stories.filter(story => 
      story.address.toLowerCase() === account?.toLowerCase()
    );
    
    if (myStories.length > 0) {
      // Show my stories in modal
      setStoryModalOpen(true);
      // Find the index of current user in allUserKeys
      const currentUserIndex = allUserKeys.findIndex(key => key.toLowerCase() === account?.toLowerCase());
      setSelectedStoryIndex(currentUserIndex >= 0 ? currentUserIndex : 0);
      
      // Mark all my stories as viewed when I click on my story
      myStories.forEach(story => {
        fetch('/api/storyViews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account: account.toLowerCase(),
            storyId: story.id
          })
        }).catch(error => {
          console.error('Error marking story as viewed:', error);
        });
      });
      
      // Update local state
      const newViewedStories = new Set([...viewedStories]);
      myStories.forEach(story => {
        newViewedStories.add(story.id);
      });
      setViewedStories(newViewedStories);
    } else {
      // If no stories, just open upload dialog
      setUploadOpen(true);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file || !account) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/upload?wallet=${account}&type=stories`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data && data.success) {
      // Story uploaded successfully, refresh stories from file system
      fetch('/api/stories').then(res => res.json()).then(setStories);
      // Trigger story added event
      window.dispatchEvent(new Event('story-added'));
    }
    setLoading(false);
    setUploadOpen(false);
    setFile(null);
  };

  return (
    <Box display="flex" alignItems="center" gap={2} width="100%" maxWidth={600} py={3} sx={{ overflowX: 'auto' }}>
      {/* My Story with Add Button (only for self) */}
      {account && (
        <Box display="flex" flexDirection="column" alignItems="center" mx={1}>
          <Box position="relative">
            {/* Glass circle effect for my story */}
            {(() => {
              const myStories = stories.filter(story => 
                story.address.toLowerCase() === account.toLowerCase()
              );
              // Only check viewed status for stories that belong to the current account
              const hasUnviewedMyStories = myStories.some(story => !viewedStories.has(story.id));
              

              
              return (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -6,
                    left: -6,
                    right: -6,
                    bottom: -6,
                    borderRadius: '50%',
                    background: hasUnviewedMyStories 
                      ? 'linear-gradient(45deg, rgba(228, 138, 58, 0.3), rgba(228, 138, 58, 0.1))'
                      : 'linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                    border: hasUnviewedMyStories 
                      ? '2px solid rgba(228, 138, 58, 0.5)'
                      : '2px solid rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(4px)',
                    animation: 'pulse 2s infinite',
                    opacity: hasUnviewedMyStories ? 1 : 0.3,
                    transition: 'opacity 0.3s ease-in-out',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)', opacity: hasUnviewedMyStories ? 0.8 : 0.2 },
                      '50%': { transform: 'scale(1.05)', opacity: hasUnviewedMyStories ? 1 : 0.4 },
                      '100%': { transform: 'scale(1)', opacity: hasUnviewedMyStories ? 0.8 : 0.2 }
                    }
                  }}
                />
              );
            })()}
            <Avatar
              src={avatarUrl}
              sx={{ 
                width: 64, 
                height: 64,
                border: (() => {
                  const myStories = stories.filter(story => 
                    story.address.toLowerCase() === account.toLowerCase()
                  );
                  const hasUnviewedMyStories = myStories.some(story => !viewedStories.has(story.id));
                  return hasUnviewedMyStories ? '3px solid #e48a3a' : '3px solid rgba(255,255,255,0.3)';
                })(),
                cursor: 'pointer',
                position: 'relative',
                zIndex: 1,
                '&:hover': {
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s ease-in-out'
                }
              }}
              onClick={() => handleMyStoryClick()}
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
                width: 64, 
                height: 64,
                border: (() => {
                  const myStories = stories.filter(story => 
                    story.address.toLowerCase() === account.toLowerCase()
                  );
                  const hasUnviewedMyStories = myStories.some(story => !viewedStories.has(story.id));
                  return hasUnviewedMyStories ? '3px solid #e48a3a' : '3px solid rgba(255,255,255,0.3)';
                })(),
                cursor: 'pointer',
                display: 'none',
                bgcolor: '#9ca3af',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1
              }}
              onClick={() => handleMyStoryClick()}
            >
              {account?.charAt(0).toUpperCase()}
            </Avatar>
            <Box
              sx={{
                position: 'absolute',
                bottom: -5,
                right: -5,
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: '#e48a3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
                cursor: 'pointer',
                zIndex: 2,
                '&:hover': {
                  transform: 'scale(1.1)',
                  transition: 'transform 0.2s ease-in-out'
                }
              }}
              onClick={() => setUploadOpen(true)}
            >
              <AddCircleIcon sx={{ fontSize: 16, color: 'white' }} />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ 
            fontSize: '0.75rem', 
            color: '#666',
            textAlign: 'center',
            mt: 0.5,
            fontWeight: 'medium'
          }}>
            My Story
          </Typography>
        </Box>
      )}
      {/* User Stories (followed + self) */}
      {userKeys.map((userKey) => {
        const userStories = storiesByUser[userKey] || [];
        const hasUnviewed = userStories.some(story => !viewedStories.has(story.id));
        const unviewedCount = userStories.filter(story => !viewedStories.has(story.id)).length;
        const displayName = usernames[userKey] && usernames[userKey].length > 0 ? usernames[userKey] : userKey.slice(0, 6) + '...' + userKey.slice(-4);
        
        return (
          <Box key={userKey} display="flex" flexDirection="column" alignItems="center" mx={1}>
            <Box position="relative">
              {/* Glass circle effect for all stories - breathing blur effect */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -6,
                  left: -6,
                  right: -6,
                  bottom: -6,
                  borderRadius: '50%',
                  background: hasUnviewed 
                    ? 'linear-gradient(45deg, rgba(228, 138, 58, 0.3), rgba(228, 138, 58, 0.1))'
                    : 'linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                  border: hasUnviewed 
                    ? '2px solid rgba(228, 138, 58, 0.5)'
                    : '2px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(4px)',
                  animation: 'pulse 2s infinite',
                  opacity: hasUnviewed ? 1 : 0.3,
                  transition: 'opacity 0.3s ease-in-out',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)', opacity: hasUnviewed ? 0.8 : 0.2 },
                    '50%': { transform: 'scale(1.05)', opacity: hasUnviewed ? 1 : 0.4 },
                    '100%': { transform: 'scale(1)', opacity: hasUnviewed ? 0.8 : 0.2 }
                  }
                }}
              />
              <Avatar 
                src={getUserAvatarUrl(userKey)}
                sx={{ 
                  width: 64, 
                  height: 64,
                  border: hasUnviewed ? '3px solid #e48a3a' : '3px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1,
                  '&:hover': {
                    transform: 'scale(1.05)',
                    transition: 'transform 0.2s ease-in-out'
                  }
                }} 
                onClick={() => handleStoryClick(userKey)}
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
                  width: 64, 
                  height: 64, 
                  border: hasUnviewed ? '3px solid #e48a3a' : '3px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  display: 'none',
                  bgcolor: '#9ca3af',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1
                }}
                onClick={() => handleStoryClick(userKey)}
              >
                {userKey.charAt(0).toUpperCase()}
              </Avatar>
              {/* Dynamic story count indicator - shows unviewed count */}
              {unviewedCount > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    bgcolor: '#e48a3a',
                    color: 'white',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    border: '2px solid white',
                    zIndex: 2
                  }}
                >
                  {unviewedCount}
                </Box>
              )}
            </Box>
            <Typography variant="caption" mt={1} sx={{ maxWidth: 72, textAlign: 'center' }}>
              {displayName}
            </Typography>
          </Box>
        );
      })}
      {/* Upload Dialog */}
      <Dialog 
        open={uploadOpen} 
        onClose={() => setUploadOpen(false)}
        disableEnforceFocus
        disableAutoFocus
      >
        <DialogTitle>Upload Story</DialogTitle>
        <DialogContent>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
          <Button onClick={handleUpload} disabled={!file || loading} variant="contained" color="primary" sx={{ mt: 2 }}>
            {loading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Story Modal */}
      <StoryModal
        open={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        stories={stories} // Pass all stories to enable navigation between users
        initialUserIndex={selectedStoryIndex >= 0 ? selectedStoryIndex : 0}
        initialStoryIndex={0}
        allUserKeys={allUserKeys} // Pass all user keys for navigation
        currentAccount={account} // Pass current account for delete functionality
      />
    </Box>
  );
} 