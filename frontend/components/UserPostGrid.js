import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import Typography from '@mui/material/Typography';
import { toast } from 'react-toastify';
import PostModal from './PostModal';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';

export default function UserPostGrid({ posts = [], onLike, onComment, onShare, isOwnProfile = false, onDelete = () => {}, isLiked = () => false, personalKey }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  // Modal state
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [clickedPostRef, setClickedPostRef] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [clickedPostPosition, setClickedPostPosition] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [likedByUser, setLikedByUser] = useState({});
  const [currentAccount, setCurrentAccount] = useState(null);

  // Load comment counts for all posts
  const loadCommentCounts = async () => {
    const counts = {};
    for (const post of posts) {
      try {
        const url = personalKey 
          ? `/api/comments?address=${post.author.toLowerCase()}&postId=${post.id}&personalKey=${personalKey}`
          : `/api/comments?address=${post.author.toLowerCase()}&postId=${post.id}`;
        const response = await fetch(url);
        if (response.ok) {
          const comments = await response.json();
          counts[post.id] = comments.length;
        } else {
          counts[post.id] = 0;
        }
      } catch (error) {
        counts[post.id] = 0;
      }
    }
    setCommentCounts(counts);
  };

  useEffect(() => {
    if (posts && posts.length > 0) loadCommentCounts();
  }, [posts, personalKey]);

  // Reload comment counts when personalKey becomes available
  useEffect(() => {
    if (personalKey && posts.length > 0) {
      loadCommentCounts();
    }
  }, [personalKey, posts]);

  // Update comment count when a comment is posted in modal
  const handleCommentPosted = (postId, newCount) => {
    setCommentCounts(prev => ({ ...prev, [postId]: newCount }));
  };

  const handleDeleteClick = (postId) => {
    setPostToDelete(postId);
    setDeleteDialogOpen(true);
    setMenuOpenId(null);
  };
  const handleDeleteConfirm = () => {
    if (postToDelete) onDelete(postToDelete);
    setDeleteDialogOpen(false);
    setPostToDelete(null);
  };
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPostToDelete(null);
  };

  // Get current account from window.ethereum
  useEffect(() => {
    async function getAccount() {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setCurrentAccount(accounts[0]?.toLowerCase() || null);
      }
    }
    getAccount();
  }, []);

  // Fetch like counts and user-like status for all posts
  useEffect(() => {
    async function fetchLikes() {
      if (!currentAccount || posts.length === 0) return;
      const counts = {};
      const liked = {};
      await Promise.all(posts.map(async post => {
        try {
          const res = await fetch(`/api/likes?address=${post.author.toLowerCase()}&postId=${post.contentHash}&user=${currentAccount}`);
          if (res.ok) {
            const data = await res.json();
            counts[post.id] = data.count;
            liked[post.id] = data.likedByUser;
          }
        } catch {}
      }));
      setLikeCounts(counts);
      setLikedByUser(liked);
    }
    fetchLikes();
  }, [posts, currentAccount]);

  // Handle smooth post click animation
  const handlePostClick = (post, event) => {
    if (isAnimating) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    // Specifically target the post image/video
    const mediaElement = event.currentTarget.querySelector('img, video');
    let mediaRect = null;
    
    if (mediaElement) {
      mediaRect = mediaElement.getBoundingClientRect();
    }
    
    setClickedPostPosition({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      scrollTop: window.pageYOffset,
      mediaTop: mediaRect ? mediaRect.top : rect.top,
      mediaLeft: mediaRect ? mediaRect.left : rect.left,
      mediaWidth: mediaRect ? mediaRect.width : rect.width,
      mediaHeight: mediaRect ? mediaRect.height : rect.height
    });
    
    setIsAnimating(true);
    setClickedPostRef(post.id);
    setSelectedPost(post);
    
    // Add a small delay to allow the scale animation to complete
    setTimeout(() => {
      setPostModalOpen(true);
      setIsAnimating(false);
      setClickedPostRef(null);
    }, 150);
  };

  // Like/unlike handler
  const handleLike = async (post) => {
    if (!currentAccount) return;
    const alreadyLiked = likedByUser[post.id];
    setLikedByUser(prev => ({ ...prev, [post.id]: !alreadyLiked }));
    setLikeCounts(prev => ({ ...prev, [post.id]: (prev[post.id] || 0) + (alreadyLiked ? -1 : 1) }));
    await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: post.author, postId: post.contentHash, user: currentAccount, action: alreadyLiked ? 'unlike' : 'like' })
    });
  };

  // Newest posts first (leftmost)
  const orderedPosts = [...posts].reverse();

  // Add menuBtnSx style at the top of the component:
  const menuBtnSx = {
    color: '#222',
    fontWeight: 500,
    borderRadius: 999,
    justifyContent: 'flex-start',
    px: 2,
    py: 1,
    minWidth: 0,
    background: 'rgba(255,255,255,0.5)',
    '&:hover': { background: 'rgba(0,0,0,0.04)' },
    boxShadow: 'none',
    textTransform: 'none',
    fontSize: 15,
    gap: 1.5,
  };

  if (!orderedPosts || orderedPosts.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={320} mt={6}>
        <CameraAltOutlinedIcon sx={{ fontSize: 64, color: '#bdbdbd', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          No posts yet
        </Typography>
      </Box>
    );
  }

  // Helper to determine if a post is owned by the current user
  // (isOwnProfile is true for your own profile, but for likes tab it's always false)
  // So we check post.author === currentAccount if available
  // For now, keep isOwnProfile logic for delete

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
          p: 0,
          mb: 6,
          maxWidth: 600,
          width: '100%',
        }}
      >
        {/* 3-column grid, gap between items, square cells */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
            width: '100%',
          }}
        >
          {orderedPosts.map(post => (
            <Box
              key={post.id}
              sx={{
                aspectRatio: '1 / 1',
                overflow: 'hidden',
                borderRadius: 2,
                boxShadow: 1,
                bgcolor: '#fff',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transform: isAnimating && clickedPostRef === post.id ? 'scale(1.05) translateZ(0)' : undefined,
                willChange: isAnimating && clickedPostRef === post.id ? 'transform' : 'auto',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: isAnimating && clickedPostRef === post.id ? 'scale(1.05) translateZ(0)' : 'scale(1.02)',
                }
              }}
              onClick={(e) => handlePostClick(post, e)}
            >
              {/* Three-dot menu button (top right) */}
              <IconButton
                onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === post.id ? null : post.id); }}
                sx={{ position: 'absolute', top: 6, right: 6, zIndex: 3, bgcolor: 'rgba(255,255,255,0.7)' }}
                size="small"
              >
                <MoreVertIcon sx={{ color: '#666' }} />
              </IconButton>
              {/* Glassmorphic pill menu */}
              {menuOpenId === post.id && (
                <ClickAwayListener onClickAway={() => setMenuOpenId(null)}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 38,
                      right: 10,
                      zIndex: 10,
                      minWidth: 180,
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.92)',
                      backdropFilter: 'blur(18px)',
                      boxShadow: '0 4px 24px 0 rgba(31,38,135,0.10)',
                      border: '1.5px solid rgba(255,255,255,0.18)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      py: 1,
                      px: 0,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <Button startIcon={<BookmarkBorderIcon />} sx={menuBtnSx} onClick={() => { setMenuOpenId(null); toast.info('Saved! (placeholder)'); }}>Save</Button>
                    <Button startIcon={<StarBorderIcon />} sx={menuBtnSx} onClick={() => { setMenuOpenId(null); toast.info('Added to favorites! (placeholder)'); }}>Add to favorites</Button>
                    {!isOwnProfile && (
                      <Button startIcon={<PersonRemoveIcon />} sx={menuBtnSx} onClick={() => { setMenuOpenId(null); toast.info('Unfollowed! (placeholder)'); }}>Unfollow</Button>
                    )}
                    <Button startIcon={<InfoOutlinedIcon />} sx={menuBtnSx} onClick={() => { setMenuOpenId(null); window.open(`/profile/${post.author}`, '_blank'); }}>About this account</Button>
                    <Button startIcon={<VisibilityOffIcon />} sx={menuBtnSx} onClick={() => { setMenuOpenId(null); toast.info('Hidden! (placeholder)'); }}>Hide</Button>
                    <Button startIcon={<ReportProblemOutlinedIcon sx={{ color: '#e53935' }} />} sx={{ ...menuBtnSx, color: '#e53935' }} onClick={() => { setMenuOpenId(null); toast.info('Reported! (placeholder)'); }}>Report</Button>
                    {isOwnProfile && (
                      <Button
                        onClick={() => { setMenuOpenId(null); handleDeleteClick(post.id); }}
                        startIcon={<DeleteIcon sx={{ color: '#e53935' }} />}
                        sx={{ ...menuBtnSx, color: '#e53935' }}
                      >
                        Delete
                      </Button>
                    )}
                  </Box>
                </ClickAwayListener>
              )}
              {post.type === 'image' ? (
                <img
                  src={`/api/media/${post.author.toLowerCase()}/posts/${post.contentHash}`}
                  alt="User post"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <video
                  src={`/api/media/${post.author.toLowerCase()}/posts/${post.contentHash}`}
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              )}
              {/* Like button overlay */}
              <IconButton
                onClick={e => { e.stopPropagation(); handleLike(post); }}
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  zIndex: 2,
                  bgcolor: likedByUser[post.id] ? 'rgba(229,57,53,0.08)' : 'rgba(255,255,255,0.8)',
                  color: likedByUser[post.id] ? '#e53935' : '#666',
                  '&:hover': { bgcolor: likedByUser[post.id] ? 'rgba(229,57,53,0.15)' : 'rgba(255,255,255,0.9)' },
                }}
                size="small"
              >
                {likedByUser[post.id] ? <FavoriteIcon sx={{ fontSize: 20 }} /> : <FavoriteBorderIcon sx={{ fontSize: 20 }} />}
                <span style={{ marginLeft: 4, fontWeight: 500, fontSize: 14 }}>{likeCounts[post.id] || 0}</span>
              </IconButton>
              {/* Comment count badge */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'rgba(255,255,255,0.85)',
                  borderRadius: 999,
                  px: 1.5,
                  py: 0.5,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#555',
                  boxShadow: 1,
                  gap: 0.5,
                }}
              >
                <ChatBubbleOutlineIcon sx={{ fontSize: 16, mr: 0.5 }} />
                {commentCounts[post.id] || 0}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        disableEnforceFocus
        disableAutoFocus
      >
        <DialogTitle>Delete this post?</DialogTitle>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="secondary">Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
      {/* Custom animated modal component */}
      <AnimatedModal
        open={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        post={selectedPost}
        clickedPosition={clickedPostPosition}
        onCommentPosted={handleCommentPosted}
        personalKey={personalKey}
      />
    </Box>
  );
}

// Custom animated modal component
const AnimatedModal = ({ open, onClose, post, clickedPosition, onCommentPosted, personalKey }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [usernames, setUsernames] = useState({});
  const [postOwnerUsername, setPostOwnerUsername] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open && post) {
      loadComments();
      getCurrentAccount();
      fetchPostOwnerUsername();
      setIsClosing(false);
    }
  }, [open, post]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // Match the animation duration
  };

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
          const contract = new ethers.Contract(require('../src/contracts.json').PostContract, require('../abis/PostContract.json').abi, provider);
          
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
      const contract = new ethers.Contract(require('../src/contracts.json').PostContract, require('../abis/PostContract.json').abi, provider);
      
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
      onClose={handleClose} 
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
          boxShadow: '0 8px 32px 0 rgba(31,38,135,0.15)',
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
            <IconButton onClick={handleClose} sx={{ ml: 'auto' }}>
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
};