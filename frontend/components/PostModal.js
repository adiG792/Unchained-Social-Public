import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, Box, Typography, IconButton, Avatar, Divider, TextField, Button, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { toast } from 'react-toastify';
import PostContractAbi from '../abis/PostContract.json';
import contracts from '../src/contracts.json';

export default function PostModal({ open, onClose, post, onCommentPosted, personalKey }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [usernames, setUsernames] = useState({});
  const [postOwnerUsername, setPostOwnerUsername] = useState('');

  useEffect(() => {
    if (open && post) {
      loadComments();
      getCurrentAccount();
      fetchPostOwnerUsername();
    }
  }, [open, post, personalKey]); // Add personalKey dependency

  const getCurrentAccount = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setCurrentAccount(accounts[0].toLowerCase());
      } catch (error) {
        console.error('Error getting current account:', error);
      }
    }
  };

  const loadComments = async () => {
    if (!post) return;
    
    setLoading(true);
    try {
      // Don't use personalKey for comments so all users can read them
      const url = `/api/comments?address=${post.author.toLowerCase()}&postId=${post.id}`;
      
  
      const response = await fetch(url);
      if (response.ok) {
        const commentsData = await response.json();

        // Sort comments by timestamp in descending order (newest first)
        const sortedComments = commentsData.sort((a, b) => b.timestamp - a.timestamp);
        setComments(sortedComments);
        
        // Fetch usernames for comment authors
        if (commentsData.length > 0) {
          const { ethers } = await import('ethers');
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(contracts.PostContract, PostContractAbi.abi, provider);
          
          const uniqueAuthors = [...new Set(commentsData.map(comment => comment.author.toLowerCase()))];
          const nameMap = {};
          for (const addr of uniqueAuthors) {
            try {
              const uname = await contract.usernames(addr);
              nameMap[addr] = uname;
            } catch {}
          }
          setUsernames(nameMap);
        }
      } else {
        console.error('Failed to load comments');
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentAccount || !post) return;

    setPosting(true);
    try {
      const commentData = {
        address: post.author.toLowerCase(),
        postId: post.id,
        author: currentAccount,
        text: newComment.trim(),
        timestamp: Date.now(),
        // Don't use personalKey for comments so all users can read them
        // personalKey: personalKey
      };

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData)
      });

      if (response.ok) {
        const result = await response.json();
        setNewComment('');
        await loadComments(); // Reload comments
        toast.success('Comment posted!');
        // Notify parent component to update comment count
        if (onCommentPosted) {
          // Reload comments to get the accurate count
          await loadComments();
          onCommentPosted(post.id, comments.length);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        toast.error('Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Helper function to get avatar URL for any user
  const getUserAvatarUrl = (userAddress) => {
    if (!userAddress) return '';
    const key = `avatar_${userAddress.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return stored;
    }
    return '';
  };

  // Helper function to get username for any user
  const getUserDisplayName = (userAddress) => {
    if (!userAddress) return '';
    const username = usernames[userAddress.toLowerCase()];
    if (username && username.length > 0) {
      return username;
    }
    return `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
  };

  // Fetch post owner's username
  const fetchPostOwnerUsername = async () => {
    if (!post || !post.author) return;
    
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contracts.PostContract, PostContractAbi.abi, provider);
      
      const username = await contract.usernames(post.author.toLowerCase());
      setPostOwnerUsername(username);
    } catch (error) {
      console.error('Error fetching post owner username:', error);
      setPostOwnerUsername('');
    }
  };

  if (!post) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      keepMounted={false}
      TransitionProps={{
        timeout: 300,
        enter: true,
        exit: true,
      }}
      PaperProps={{
        sx: {
          borderRadius: 6,
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
          animation: open ? 'modalEnter 0.3s ease-out' : 'modalExit 0.2s ease-in',
          '@keyframes modalEnter': {
            '0%': {
              opacity: 0,
              transform: 'scale(0.8) translateY(20px)',
            },
            '100%': {
              opacity: 1,
              transform: 'scale(1) translateY(0)',
            },
          },
          '@keyframes modalExit': {
            '0%': {
              opacity: 1,
              transform: 'scale(1) translateY(0)',
            },
            '100%': {
              opacity: 0,
              transform: 'scale(0.8) translateY(20px)',
            },
          },
        }
      }}
    >
      <DialogContent 
        sx={{ 
          p: 0, 
          display: 'flex', 
          minHeight: 500, 
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {/* Left: Media */}
        <Box 
          flex={1.2} 
          display="flex" 
          alignItems="center" 
          justifyContent="center" 
          bgcolor="#000" 
          minHeight={500}
          sx={{ borderTopLeftRadius: 24, borderBottomLeftRadius: 24 }}
        >
          {post.contentHash.endsWith('.mp4') ? (
            <video 
              src={`/api/media/${post.author.toLowerCase()}/posts/${post.contentHash}`} 
              controls 
              style={{ maxWidth: 400, maxHeight: 600, borderRadius: 0 }} 
            />
          ) : (
            <img 
              src={`/api/media/${post.author.toLowerCase()}/posts/${post.contentHash}`} 
              alt="post" 
              style={{ maxWidth: 400, maxHeight: 600, borderRadius: 0 }} 
            />
          )}
        </Box>
        
        {/* Right: Comments and actions */}
        <Box 
          flex={1} 
          display="flex" 
          flexDirection="column" 
          minWidth={320} 
          maxWidth={400}
          sx={{ 
            borderTopRightRadius: 24, 
            borderBottomRightRadius: 24, 
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          {/* Header */}
          <Box display="flex" alignItems="center" p={2}>
            <Box position="relative">
              <Avatar 
                src={(() => {
                  if (typeof window !== 'undefined') {
                    const stored = localStorage.getItem(`avatar_${post.author.toLowerCase()}`);
                    if (stored) {
                      return `${stored}?t=${Date.now()}`;
                    }
                  }
                  return `/api/media/${post.author.toLowerCase()}/profile/avatar.jpg?t=${Date.now()}`;
                })()}
                sx={{ width: 40, height: 40, mr: 2 }}
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
                  width: 40, 
                  height: 40, 
                  mr: 2, 
                  display: 'none',
                  bgcolor: '#6366f1',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              >
                {post.author.charAt(0).toUpperCase()}
              </Avatar>
            </Box>
            <Box>
              <Typography fontWeight={700} fontSize="1rem">
                {postOwnerUsername && postOwnerUsername.length > 0 
                  ? postOwnerUsername 
                  : `${post.author.slice(0, 6)}...${post.author.slice(-4)}`
                }
              </Typography>
              {postOwnerUsername && postOwnerUsername.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {post.author.slice(0, 6)}...{post.author.slice(-4)}
                </Typography>
              )}
            </Box>
            <IconButton onClick={onClose} sx={{ ml: 'auto' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Divider />
          
          {/* Comments Section */}
          <Box flex={1} overflow="auto" p={2}>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress size={24} />
              </Box>
            ) : comments.length > 0 ? (
              comments.map((comment, i) => (
                <Box key={i} display="flex" alignItems="flex-start" mb={2}>
                  <Box position="relative">
                    <Avatar 
                      src={getUserAvatarUrl(comment.author)}
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        mr: 1,
                        bgcolor: '#9ca3af',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
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
                        width: 32, 
                        height: 32, 
                        mr: 1,
                        display: 'none',
                        bgcolor: '#9ca3af',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                    >
                      {comment.author.charAt(0).toUpperCase()}
                    </Avatar>
                  </Box>
                  <Box flex={1}>
                    <Typography fontWeight={600} fontSize="0.875rem">
                      {getUserDisplayName(comment.author)}
                    </Typography>
                    {usernames[comment.author.toLowerCase()] && usernames[comment.author.toLowerCase()].length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {comment.author.slice(0, 6)}...{comment.author.slice(-4)}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {comment.text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(comment.timestamp)}
                    </Typography>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography color="text.secondary" textAlign="center" p={3}>
                No comments yet.
              </Typography>
            )}
          </Box>
          
          <Divider />
          
          {/* Comment Input */}
          <Box p={2} display="flex" alignItems="center" gap={1}>
            <TextField 
              size="small" 
              placeholder="Add a comment..." 
              fullWidth
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !posting) {
                  handlePostComment();
                }
              }}
              disabled={posting}
            />
            <Button 
              variant="contained" 
              color="primary"
              onClick={handlePostComment}
              disabled={!newComment.trim() || posting}
              sx={{ minWidth: 60 }}
            >
              {posting ? <CircularProgress size={16} /> : 'Post'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
} 