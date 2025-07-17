import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import PostModal from './PostModal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FilterListIcon from '@mui/icons-material/FilterList';
import PhotoIcon from '@mui/icons-material/Photo';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import CloseIcon from '@mui/icons-material/Close';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import PostContractAbi from '../abis/PostContract.json';
import contracts from '../src/contracts.json';

export default function Feed({ contractAddress, abi, tokenAddress, tokenAbi, setReloadBalance, reloadTrigger, activeMode = 'feed', personalKey }) {
  const [posts, setPosts] = useState([]);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' or 'posts'
  // New state for follow system
  const [feedMode, setFeedMode] = useState('following'); // 'following' for feed, 'global' for explore
  const [followingList, setFollowingList] = useState([]);
  
  // Media filter state
  const [mediaFilter, setMediaFilter] = useState('all'); // 'all', 'images', 'videos'
  
  // Track following status for each user
  const [followingStatus, setFollowingStatus] = useState({}); // {address: true/false}
  
  // Comment counts for posts
  const [commentCounts, setCommentCounts] = useState({});
  
  // Delete post logic
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [clickedPostRef, setClickedPostRef] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [clickedPostPosition, setClickedPostPosition] = useState(null);

  // Add state for menu open/close
  const [menuOpenId, setMenuOpenId] = useState(null);

  const [likeCounts, setLikeCounts] = useState({});
  const [likedByUser, setLikedByUser] = useState({});
  const [usernames, setUsernames] = useState({});
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Set feed mode based on activeMode prop
  useEffect(() => {
    if (activeMode === 'explore') {
      setFeedMode('global');
    } else {
      setFeedMode('following');
    }
  }, [activeMode]);

  // Handle comment count update
  const handleCommentPosted = (postId, newCount) => {
    setCommentCounts(prev => ({
      ...prev,
      [postId]: newCount
    }));
  };

  // Handle smooth post click animation
  const handlePostClick = (post, event) => {
    if (isAnimating) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    // Specifically target the post image/video, not profile pictures
    const mediaElement = event.currentTarget.querySelector('.mb-3 img, .mb-3 video');
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
    }, 100);
  };

  // Helper function to get avatar URL for any user (like StoryBar)
  const getUserAvatarUrl = (userAddress) => {
    if (!userAddress) return '';
    const key = `avatar_${userAddress.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return stored;
    }
    return '';
  };

  // Check if media file exists without spamming console
  const checkMediaExists = async (author, contentHash) => {
    const src = `/api/media/${author.toLowerCase()}/posts/${contentHash}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced timeout
      const res = await fetch(src, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (e) {
      // Silently handle expected errors (404s, timeouts, network issues)
      return false;
    }
  };

  // Load comment counts for posts
  const loadCommentCounts = async (postsToCheck) => {
    const counts = {};
    for (const post of postsToCheck) {
      try {
        // Don't use personalKey for comments so all users can read them
        const url = `/api/comments?address=${post.author.toLowerCase()}&postId=${post.id}`;
        const response = await fetch(url);
        if (response.ok) {
          const comments = await response.json();
          counts[post.id] = comments.length;
        } else {
          counts[post.id] = 0;
        }
      } catch (error) {
        console.error('Error loading comment count for post:', post.id, error);
        counts[post.id] = 0;
      }
    }
    setCommentCounts(counts);
  };

  useEffect(() => {
    setLoading(true); // Start loading before fetch
    async function loadPosts() {
      if (!window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const postCount = await contract.postCount();
        const count = Number(postCount);
        


        // Get current user address first
        const signer = await provider.getSigner();
        const currentUser = await signer.getAddress();
        
        // Fetch following list if in following mode
        let currentFollowingList = [];
        if (feedMode === 'following') {
          try {
            const following = await contract.getFollowing(currentUser);
            currentFollowingList = following.map(addr => addr.toLowerCase());
            setFollowingList(currentFollowingList);
          } catch (e) {
            console.error("Couldn't fetch following list", e);
          }
        }

        const postPromises = [];
        for (let i = count; i >= 1; i--) {
          postPromises.push(contract.posts(i));
        }

        const postResults = await Promise.all(postPromises);
        
        const postArray = postResults
          .map(post => ({
            id: post.id.toString(),
            author: post.author,
            contentHash: post.contentHash,
            timestamp: new Date(Number(post.timestamp) * 1000).toLocaleString(),
          }))
          .filter(post => {
            const isImage = /\.(png|jpe?g|gif)$/i.test(post.contentHash);
            const isVideo = post.contentHash.endsWith('.mp4');

            // Apply media filter
            if (mediaFilter === 'images' && !isImage) return false;
            if (mediaFilter === 'videos' && !isVideo) return false;

            // Apply global/following filter using the current following list
            if (feedMode === 'following') {
              const postAuthor = post.author.toLowerCase();
              const isOwnPost = postAuthor === currentUser.toLowerCase();
              const isFollowing = currentFollowingList.includes(postAuthor);
              
              // Show posts from people you follow OR your own posts
              if (!isFollowing && !isOwnPost) return false;
            }

            return true;
          });

        // Filter out posts whose media file does not exist
        const filteredPosts = await Promise.all(
          postArray.map(async (post) => {
            const isMediaExists = await checkMediaExists(post.author, post.contentHash);
            if (isMediaExists) return post;
            return null;
          })
        );
        

        setPosts(filteredPosts.filter(Boolean));

        const accountAddress = await signer.getAddress();
        setCurrentAccount(accountAddress.toLowerCase());

          // Load comment counts for all posts
  await loadCommentCounts(filteredPosts.filter(Boolean));
  
  // Fetch usernames for all unique authors
  const uniquePostAuthors = [...new Set(filteredPosts.filter(Boolean).map(post => post.author.toLowerCase()))];
  const nameMap = {};
  for (const addr of uniquePostAuthors) {
    try {
      const uname = await contract.usernames(addr);
      nameMap[addr] = uname;
    } catch {}
  }
  setUsernames(nameMap);
        
        // Also fetch like counts after posts are loaded
        const counts = {};
        const liked = {};
        await Promise.all(filteredPosts.filter(Boolean).map(async post => {
          try {
            const res = await fetch(`/api/likes?address=${post.author.toLowerCase()}&postId=${post.contentHash}&user=${accountAddress.toLowerCase()}`);
            if (res.ok) {
              const data = await res.json();
              counts[post.id] = data.count;
              liked[post.id] = data.likedByUser;
            }
          } catch {}
        }));
        setLikeCounts(counts);
        setLikedByUser(liked);

        // Check following status for all unique authors
        const uniqueAuthors = [...new Set(postArray.map(post => post.author.toLowerCase()))];
        const statusPromises = uniqueAuthors.map(async (author) => {
          try {
            const isFollowing = await contract.isFollowing(accountAddress, author);
            return { author, isFollowing };
          } catch (error) {
            console.error(`Error checking following status for ${author}:`, error);
            return { author, isFollowing: false };
          }
        });

        const statusResults = await Promise.all(statusPromises);
        const statusMap = {};
        statusResults.forEach(({ author, isFollowing }) => {
          statusMap[author] = isFollowing;
        });
        setFollowingStatus(statusMap);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false); // Only stop loading after filtering is done
      }
    }

    loadPosts();

    // Add account change listener
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        window.location.reload();
      }
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [contractAddress, abi, reloadTrigger, feedMode, mediaFilter]);

  async function tipAuthor(authorAddress) {
    if (!window.ethereum) {
      alert('MetaMask not found');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
      const userAddress = await signer.getAddress();

      const amount = ethers.parseEther('10');

      // Check if user has enough SOC tokens
      const balance = await tokenContract.balanceOf(userAddress);
      if (balance < amount) {
        toast.error(`Insufficient SOC tokens. You need 10 SOC but only have ${ethers.formatEther(balance)}`);
        return;
      }

      // Check ETH balance for gas
      const ethBalance = await provider.getBalance(userAddress);
      if (ethBalance < ethers.parseEther('0.001')) { // Rough estimate for gas
        toast.error('Insufficient ETH for gas fees');
        return;
      }

      const tx = await tokenContract.transfer(authorAddress, amount);
      await tx.wait();

      toast.success('Tip sent! Balance updated!');

      if (setReloadBalance) {
        setReloadBalance(prev => !prev);
      }
    } catch (error) {
      console.error('Error sending tip:', error);
      
      // Handle various MetaMask rejection scenarios
      if (error.code === 'ACTION_REJECTED' || 
          error.code === 4001 || 
          error.message?.includes('user rejected') ||
          error.message?.includes('User rejected') ||
          error.message?.includes('cancelled') ||
          error.message?.includes('Cancelled') ||
          error.message?.includes('denied') ||
          error.message?.includes('Denied')) {
        toast.info('Transaction cancelled');
      } else if (error.code === 'CALL_EXCEPTION') {
        // Handle contract execution errors
        if (error.data?.includes('e450d38c')) {
          toast.error('Insufficient SOC token balance for tip');
        } else {
          toast.error('Transaction failed - please check your token balance and try again');
        }
      } else {
        toast.error('Error sending tip');
      }

      // Refresh posts to get updated data
      setReloadBalance(prev => !prev);
    }
  }

  async function toggleFollowUser(userAddress, isCurrentlyFollowing) {
    if (!window.ethereum) return alert('MetaMask not found');
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);
      let tx;
      if (isCurrentlyFollowing) {
        tx = await contract.unfollow(userAddress);
      } else {
        tx = await contract.follow(userAddress);
      }
      await tx.wait();
      toast.success(`${isCurrentlyFollowing ? 'Unfollowed' : 'Now following'} user!`);
      setFollowingStatus(prev => ({ ...prev, [userAddress.toLowerCase()]: !isCurrentlyFollowing }));
      if (setReloadBalance) {
        setReloadBalance(prev => !prev);
      }
    } catch (err) {
      console.error('Follow/unfollow error:', err);
      
      // Handle various MetaMask rejection scenarios
      if (err.code === 'ACTION_REJECTED' || 
          err.code === 4001 || 
          err.message?.includes('user rejected') ||
          err.message?.includes('User rejected') ||
          err.message?.includes('cancelled') ||
          err.message?.includes('Cancelled') ||
          err.message?.includes('denied') ||
          err.message?.includes('Denied')) {
        toast.info('Transaction cancelled');
      } else {
        toast.error(`Failed to ${isCurrentlyFollowing ? 'unfollow' : 'follow'} user`);
      }
    }
  }

  // Delete post logic
  const handleDeleteClick = (post) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;
    try {
      const res = await fetch('/api/deletePost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: postToDelete.author, contentHash: postToDelete.contentHash })
      });
      if (!res.ok) throw new Error('Failed to delete post');
      toast.success('Post deleted!');
      
      // Remove the post from local state immediately to prevent 404 errors
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postToDelete.id));
      
      setReloadBalance && setReloadBalance(prev => !prev);
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    } catch (err) {
      console.error('Error deleting post:', err);
      toast.error('Failed to delete post');
    }
  };
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPostToDelete(null);
  };

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

  // Fetch like counts and user-like status for all posts
  useEffect(() => {
    async function fetchLikes() {
      if (posts.length === 0) return;
      const counts = {};
      const liked = {};
      await Promise.all(posts.map(async post => {
        try {
                      const res = await fetch(`/api/likes?address=${post.author.toLowerCase()}&postId=${post.contentHash}&user=${currentAccount || ''}`);
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

  // Reload counts when account changes
  useEffect(() => {
    if (currentAccount && posts.length > 0) {
      loadCommentCounts(posts);
      // Re-fetch likes when account changes
      const fetchLikes = async () => {
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
      };
      fetchLikes();
    }
  }, [currentAccount, posts, personalKey]);

  // Reload comment counts when personalKey becomes available
  useEffect(() => {
    if (personalKey && posts.length > 0) {
      loadCommentCounts(posts);
    }
  }, [personalKey, posts]);

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

  // Helper function to render posts
  const renderPosts = (postsToRender) => {
    return postsToRender.map(post => {
      const isSelfPost = currentAccount === post.author.toLowerCase();
      const isVideo = post.contentHash.endsWith('.mp4');
      const isImage = /\.(png|jpe?g|gif)$/i.test(post.contentHash);
      const isFollowingUser = followingStatus[post.author.toLowerCase()] || false;
      const isLiked = likedByUser[post.id];

      return (
        <div
          key={post.id}
          className={`post-box p-6 mb-6 rounded-2xl transition-all cursor-pointer relative overflow-hidden ${
            isAnimating && clickedPostRef === post.id ? 'scale-105' : 'hover:scale-[1.02]'
          }`}
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
            transform: isAnimating && clickedPostRef === post.id ? 'scale(1.05) translateZ(0)' : undefined,
            willChange: isAnimating && clickedPostRef === post.id ? 'transform' : 'auto',
          }}
          onClick={(e) => handlePostClick(post, e)}
        >
                  {/* Three-dot menu button (top right) */}
        <IconButton
          onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === post.id ? null : post.id); }}
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            zIndex: 2, 
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.3)',
            }
          }}
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
              {!isSelfPost && (
                isFollowingUser ? (
                  <Button startIcon={<PersonRemoveIcon />} sx={menuBtnSx} onClick={() => { setMenuOpenId(null); toggleFollowUser(post.author, true); }}>Unfollow</Button>
                ) : (
                  <Button startIcon={<PersonAddIcon />} sx={menuBtnSx} onClick={() => { setMenuOpenId(null); toggleFollowUser(post.author, false); }}>Follow</Button>
                )
              )}
              <Button startIcon={<InfoOutlinedIcon />} sx={menuBtnSx} onClick={() => { setMenuOpenId(null); window.open(`/profile/${post.author}`, '_blank'); }}>About this account</Button>
              <Button startIcon={<VisibilityOffIcon />} sx={menuBtnSx} onClick={() => { setMenuOpenId(null); setPosts(posts.filter(p => p.id !== post.id)); }}>Hide</Button>
              <Button startIcon={<ReportProblemOutlinedIcon sx={{ color: '#e53935' }} />} sx={{ ...menuBtnSx, color: '#e53935' }} onClick={() => { setMenuOpenId(null); toast.info('Reported! (placeholder)'); }}>Report</Button>
              {isSelfPost && (
                <Button
                  onClick={() => { setMenuOpenId(null); handleDeleteClick(post); }}
                  startIcon={<DeleteIcon sx={{ color: '#e53935' }} />}
                  sx={{ ...menuBtnSx, color: '#e53935' }}
                >
                  Delete
                </Button>
              )}
            </Box>
          </ClickAwayListener>
        )}
          <div className="mb-2 text-sm text-text-muted">Post #{post.id}</div>

          {/* Author info with avatar and username */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <Avatar
                src={getUserAvatarUrl(post.author)}
                sx={{ 
                  width: 40, 
                  height: 40,
                  bgcolor: '#9ca3af',
                  color: 'white',
                  fontSize: '16px',
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
                  width: 40, 
                  height: 40,
                  bgcolor: '#9ca3af',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              >
                {post.author.charAt(0).toUpperCase()}
              </Avatar>
            </div>
            <div>
              <p className="font-semibold text-gray-800">
                {isSelfPost ? (
                  <span className="text-blue-600">You</span>
                ) : (
                  <a
                    href={`/profile/${post.author}`}
                    className="text-blue-600 hover:underline transition"
                  >
                    {usernames[post.author.toLowerCase()] && usernames[post.author.toLowerCase()].length > 0 
                      ? usernames[post.author.toLowerCase()] 
                      : `${post.author.slice(0, 6)}...${post.author.slice(-4)}`
                    }
                  </a>
                )}
              </p>
              {!isSelfPost && usernames[post.author.toLowerCase()] && usernames[post.author.toLowerCase()].length > 0 && (
                <p className="text-xs text-gray-500">
                  {post.author.slice(0, 6)}...{post.author.slice(-4)}
                </p>
              )}
            </div>
          </div>

          {isImage && (
            <>
              <div className="mb-3 overflow-hidden rounded-2xl" style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <img
                  src={`/api/media/${post.author}/posts/${post.contentHash}`}
                  alt="Post media"
                  className="w-full max-w-md"
                  style={{ 
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    objectFit: 'cover',
                    borderRadius: '16px'
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Filename: {post.contentHash}</p>
            </>
          )}

          {isVideo && (
            <>
              <div className="mb-3 overflow-hidden rounded-2xl" style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <video
                  src={`/api/media/${post.author}/posts/${post.contentHash}`}
                  controls
                  className="w-full max-w-md"
                  style={{ 
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    objectFit: 'cover',
                    borderRadius: '16px'
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Filename: {post.contentHash}</p>
            </>
          )}

          <p className="text-xs text-text-muted mb-2">{post.timestamp}</p>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200/30">
            {/* Like Button */}
            <button
              onClick={e => { e.stopPropagation(); handleLike(post); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                isLiked
                  ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' 
                  : 'text-gray-600 hover:text-red-500 hover:bg-red-500/10'
              }`}
              style={{
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm font-medium">
                Like {likeCounts[post.id] > 0 && `(${likeCounts[post.id]})`}
              </span>
            </button>
            
            {/* Comment Button: open modal on click */}
            <button
              onClick={e => { 
                e.stopPropagation(); 
                // Find the parent post box for proper animation
                const postBox = e.currentTarget.closest('.post-box');
                if (postBox) {
                  // Create a synthetic event with the post box as target
                  const syntheticEvent = {
                    currentTarget: postBox,
                    stopPropagation: () => {}
                  };
                  handlePostClick(post, syntheticEvent);
                } else {
                  handlePostClick(post, e);
                }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-gray-600 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
              style={{
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-medium">
                Comment {commentCounts[post.id] > 0 && `(${commentCounts[post.id]})`}
              </span>
            </button>
            
            {/* Share Button */}
            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}/post/${post.id}`;
                navigator.clipboard.writeText(shareUrl);
                toast.success('Post link copied to clipboard!');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-gray-600 hover:text-green-500 hover:bg-green-500/10 transition-all"
              style={{
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>

          {!isSelfPost ? (
            <div className="flex gap-3 mt-4">
              <button
                onClick={(e) => { e.stopPropagation(); tipAuthor(post.author); }}
                className="px-4 py-2 text-sm bg-accent text-white rounded-full hover:bg-accent-soft transition"
              >
                Tip 10 SOC
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleFollowUser(post.author, isFollowingUser); }}
                className={`px-3 py-2 text-sm rounded-full transition ${
                  isFollowingUser
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isFollowingUser ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          ) : (
            <div className="mt-4 text-sm text-gray-500 italic">You cannot tip yourself</div>
          )}
        </div>
      );
    });
  };

  // Custom animated modal component
  const AnimatedModal = ({ open, onClose, post, clickedPosition, onCommentPosted }) => {
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

    if (!open || !post || !clickedPosition) return null;

    const modalStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
    };

    const contentStyle = {
      position: 'absolute',
      top: clickedPosition.top,
      left: clickedPosition.left,
      width: clickedPosition.width,
      height: clickedPosition.height,
      background: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '16px',
      overflow: 'hidden',
      transform: 'translateZ(0)',
      willChange: 'transform, top, left, width, height',
      animation: isClosing ? 'modalTransformClose 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'modalTransform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
    };

    const mediaStyle = {
      position: 'absolute',
      top: clickedPosition.mediaTop - clickedPosition.top,
      left: clickedPosition.mediaLeft - clickedPosition.left,
      width: clickedPosition.mediaWidth,
      height: clickedPosition.mediaHeight,
      borderRadius: '16px',
      overflow: 'hidden',
      transform: 'translateZ(0)',
      willChange: 'transform, top, left, width, height',
      animation: isClosing ? 'mediaTransformClose 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'mediaTransform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
    };

    return (
      <div style={modalStyle} onClick={handleClose}>
        <div 
          style={contentStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <style>
            {`
              @keyframes modalTransform {
                0% {
                  top: ${clickedPosition.top}px;
                  left: ${clickedPosition.left}px;
                  width: ${clickedPosition.width}px;
                  height: ${clickedPosition.height}px;
                  transform: scale(1);
                }
                100% {
                  top: 50%;
                  left: 50%;
                  width: 90vw;
                  height: 85vh;
                  transform: translate(-50%, -50%) scale(1);
                }
              }
              @keyframes modalTransformClose {
                0% {
                  top: 50%;
                  left: 50%;
                  width: 90vw;
                  height: 85vh;
                  transform: translate(-50%, -50%) scale(1);
                }
                100% {
                  top: ${clickedPosition.top}px;
                  left: ${clickedPosition.left}px;
                  width: ${clickedPosition.width}px;
                  height: ${clickedPosition.height}px;
                  transform: scale(1);
                }
              }
              @keyframes mediaTransform {
                0% {
                  top: ${clickedPosition.mediaTop - clickedPosition.top}px;
                  left: ${clickedPosition.mediaLeft - clickedPosition.left}px;
                  width: ${clickedPosition.mediaWidth}px;
                  height: ${clickedPosition.mediaHeight}px;
                  transform: scale(1);
                }
                100% {
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  transform: scale(1);
                }
              }
              @keyframes mediaTransformClose {
                0% {
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  transform: scale(1);
                }
                100% {
                  top: ${clickedPosition.mediaTop - clickedPosition.top}px;
                  left: ${clickedPosition.mediaLeft - clickedPosition.left}px;
                  width: ${clickedPosition.mediaWidth}px;
                  height: ${clickedPosition.mediaHeight}px;
                  transform: scale(1);
                }
              }
              @keyframes commentPanelOpen {
                0% {
                  opacity: 0;
                  transform: translateX(100%);
                  width: 0;
                  flex: 0;
                }
                100% {
                  opacity: 1;
                  transform: translateX(0);
                  width: 100%;
                  flex: 1;
                }
              }
              @keyframes commentPanelClose {
                0% {
                  opacity: 1;
                  transform: translateX(0);
                  width: 100%;
                  flex: 1;
                }
                100% {
                  opacity: 1;
                  transform: translateX(-100%);
                  width: 0;
                  flex: 0;
                }
              }
            `}
          </style>
          
          {/* Modal content */}
          <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)'
          }}>
            {/* Left: Media */}
            <div style={{ 
              flex: isClosing ? '1' : '1.5', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: isClosing ? 'rgba(255, 255, 255, 0.25)' : '#000',
              backdropFilter: isClosing ? 'blur(20px)' : 'none',
              border: isClosing ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
              borderRadius: isClosing ? '16px' : '16px 0 0 16px',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              boxShadow: isClosing ? '0 8px 32px 0 rgba(31, 38, 135, 0.15)' : 'none',
              transform: 'translateZ(0)',
              willChange: 'flex, background, backdrop-filter, border, border-radius, box-shadow'
            }}>
              {/* Animated Media Element */}
              <div style={mediaStyle}>
                {post.contentHash.endsWith('.mp4') ? (
                  <video 
                    src={`/api/media/${post.author.toLowerCase()}/posts/${post.contentHash}`} 
                    controls 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      borderRadius: '16px'
                    }} 
                  />
                ) : (
                  <img 
                    src={`/api/media/${post.author.toLowerCase()}/posts/${post.contentHash}`} 
                    alt="post" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      borderRadius: '16px'
                    }} 
                  />
                )}
              </div>
            </div>
            
            {/* Right: Comments and actions */}
            <div style={{ 
              flex: isClosing ? 0 : 1, 
              display: 'flex', 
              flexDirection: 'column', 
              minWidth: isClosing ? '0px' : '280px', 
              maxWidth: isClosing ? '0px' : '350px',
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '0 16px 16px 0',
              animation: isClosing ? 'commentPanelClose 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'commentPanelOpen 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
              overflow: 'hidden',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
              transform: 'translateZ(0)',
              willChange: 'transform, opacity, width, flex'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <Avatar 
                    src={getUserAvatarUrl(post.author)}
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      marginRight: '16px',
                      bgcolor: '#9ca3af',
                      color: 'white',
                      fontSize: '16px',
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
                      width: 40, 
                      height: 40, 
                      marginRight: '16px',
                      display: 'none',
                      bgcolor: '#9ca3af',
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
                </div>
                <div>
                  <Typography fontWeight={700} fontSize="1rem">
                    {usernames[post.author.toLowerCase()] && usernames[post.author.toLowerCase()].length > 0 
                      ? usernames[post.author.toLowerCase()] 
                      : `${post.author.slice(0, 6)}...${post.author.slice(-4)}`
                    }
                  </Typography>
                  {usernames[post.author.toLowerCase()] && usernames[post.author.toLowerCase()].length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {post.author.slice(0, 6)}...{post.author.slice(-4)}
                    </Typography>
                  )}
                </div>
                <IconButton onClick={handleClose} sx={{ marginLeft: 'auto' }}>
                  <CloseIcon />
                </IconButton>
              </div>
              
              <Divider />
              
              {/* Comments Section */}
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '16px'
              }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                    <CircularProgress size={24} />
                  </div>
                ) : comments.length > 0 ? (
                  comments.map((comment, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ position: 'relative' }}>
                        <Avatar 
                          src={getUserAvatarUrl(comment.author)}
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            marginRight: '8px',
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
                            marginRight: '8px',
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
                      </div>
                      <div style={{ flex: 1 }}>
                        <Typography fontWeight={600} fontSize="0.875rem">
                          {getUserDisplayName(comment.author)}
                        </Typography>
                        {usernames[comment.author.toLowerCase()] && usernames[comment.author.toLowerCase()].length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', marginBottom: '4px' }}>
                            {comment.author.slice(0, 6)}...{comment.author.slice(-4)}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ marginBottom: '4px' }}>
                          {comment.text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(comment.timestamp)}
                        </Typography>
                      </div>
                    </div>
                  ))
                ) : (
                  <Typography color="text.secondary" textAlign="center" sx={{ padding: '24px' }}>
                    No comments yet.
                  </Typography>
                )}
              </div>
              
              <Divider />
              
              {/* Comment Input */}
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Media Filter with Glassmorphic Design */}
      <div className="mb-6 flex gap-2 justify-center items-center">
        {/* Filter Icon Button */}
        <Box position="relative">
          <IconButton
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            sx={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
              color: '#e48a3a',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.35)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <FilterListIcon />
          </IconButton>
          
          {/* Filter Dropdown Menu */}
          {filterMenuOpen && (
            <ClickAwayListener onClickAway={() => setFilterMenuOpen(false)}>
              <Box
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  mt: 1,
                  minWidth: 200,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  zIndex: 1000,
                  py: 1,
                }}
              >
                <Button
                  startIcon={<AllInclusiveIcon />}
                  onClick={() => { setMediaFilter('all'); setFilterMenuOpen(false); }}
                  sx={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    px: 2,
                    py: 1.5,
                    color: mediaFilter === 'all' ? '#e48a3a' : '#666',
                    '&:hover': {
                      background: 'rgba(228, 138, 58, 0.1)',
                    }
                  }}
                >
                  All Posts
                </Button>
                <Button
                  startIcon={<PhotoIcon />}
                  onClick={() => { setMediaFilter('images'); setFilterMenuOpen(false); }}
                  sx={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    px: 2,
                    py: 1.5,
                    color: mediaFilter === 'images' ? '#e48a3a' : '#666',
                    '&:hover': {
                      background: 'rgba(228, 138, 58, 0.1)',
                    }
                  }}
                >
                  Images Only
                </Button>
                <Button
                  startIcon={<VideoLibraryIcon />}
                  onClick={() => { setMediaFilter('videos'); setFilterMenuOpen(false); }}
                  sx={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    px: 2,
                    py: 1.5,
                    color: mediaFilter === 'videos' ? '#e48a3a' : '#666',
                    '&:hover': {
                      background: 'rgba(228, 138, 58, 0.1)',
                    }
                  }}
                >
                  Videos Only
                </Button>
              </Box>
            </ClickAwayListener>
          )}
        </Box>
        
        {/* Current Filter Display */}
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: 2,
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: '#e48a3a',
            fontWeight: 600,
            fontSize: '0.875rem'
          }}
        >
          {mediaFilter === 'all' && <AllInclusiveIcon sx={{ fontSize: 20 }} />}
          {mediaFilter === 'images' && <PhotoIcon sx={{ fontSize: 20 }} />}
          {mediaFilter === 'videos' && <VideoLibraryIcon sx={{ fontSize: 20 }} />}
          {mediaFilter === 'all' && 'All Posts'}
          {mediaFilter === 'images' && 'Images Only'}
          {mediaFilter === 'videos' && 'Videos Only'}
        </Box>
      </div>

      <div className="min-h-96">
        {loading ? (
          <div className="flex justify-center items-center min-h-[320px] mt-6">
            <CircularProgress color="warning" size={64} />
          </div>
        ) : (activeMode === 'feed' || activeMode === 'explore') ? (
          posts.length > 0 ? (
            renderPosts(posts)
          ) : (
            <div className="text-center py-12">
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No posts found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeMode === 'explore' 
                  ? "No posts with available media found. Posts may have been deleted or media files are missing."
                  : "You're not following anyone yet, or the people you follow haven't posted anything."
                }
              </Typography>
            </div>
          )
        ) : (
          <div className="text-center py-12 text-lg text-gray-400">
            Switch to feed mode to see posts
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
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

              <AnimatedModal
          open={postModalOpen}
          onClose={() => setPostModalOpen(false)}
          post={selectedPost}
          clickedPosition={clickedPostPosition}
          onCommentPosted={handleCommentPosted}
        />
    </div>
  );
}