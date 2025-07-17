import React, { useEffect, useState } from 'react';
import { ethers, BigNumber } from 'ethers';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import UserStats from './UserStats';
import UserTabs from './UserTabs';
import UserPostGrid from './UserPostGrid';
import UserProfileStatsBar from './UserProfileStatsBar';
import PostContractAbi from '../abis/PostContract.json';
import lookupENS from '../utils/lookupENS';
import getUserStats, { validateAvatarUrl } from '../utils/getUserStats';
import { toast } from 'react-toastify';
import SocialTokenAbi from '../abis/SocialToken.json';
import { useRouter } from 'next/router';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import SecurityIcon from '@mui/icons-material/Security';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Slide from '@mui/material/Slide';
import Avatar from '@mui/material/Avatar';
import Fade from '@mui/material/Fade';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CircularProgress from '@mui/material/CircularProgress';

const contractAddress = require('../src/contracts.json').PostContract;
const tokenAddress = require('../src/contracts.json').SocialToken;

// iOS-style switch
const IOSSwitch = styled(Switch)(({ theme }) => ({
  width: 52,
  height: 32,
  padding: 0,
  display: 'flex',
  '&:active .MuiSwitch-thumb': {
    width: 28,
  },
  '& .MuiSwitch-switchBase': {
    padding: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(20px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        background: 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)',
        opacity: 1,
        border: 0,
        boxShadow: '0 0 8px 2px #43e97b55',
      },
    },
  },
  '& .MuiSwitch-thumb': {
    boxShadow: '0 2px 4px 0 #0003',
    width: 28,
    height: 28,
    borderRadius: 14,
    transition: theme.transitions.create(['width'], {
      duration: 200,
    }),
    background: '#fff',
  },
  '& .MuiSwitch-track': {
    borderRadius: 32,
    background: 'rgba(180,180,180,0.3)',
    opacity: 1,
    transition: theme.transitions.create(['background'], {
      duration: 300,
    }),
  },
}));

const EditProfileDialog = ({ open, onClose, avatarUrl, onAvatarChange, name, setName, username, setUsername, pronouns, setPronouns, bio, setBio, showOnlineStatus, setShowOnlineStatus, onSave, newAvatarFile, setNewAvatarFile }) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullScreen
    TransitionComponent={Slide}
    PaperProps={{
      sx: {
        background: 'rgba(255,255,255,0.35)',
        backdropFilter: 'blur(32px)',
        boxShadow: '0 8px 32px 0 rgba(31,38,135,0.10)',
        borderRadius: 0,
        bgcolor: '#fdf6f0',
      }
    }}
  >
    <Box display="flex" flexDirection="column" alignItems="center" py={4}>
      <Box position="relative" mb={2}>
        <Avatar
          src={newAvatarFile ? URL.createObjectURL(newAvatarFile) : avatarUrl}
          alt="avatar"
          sx={{ width: 120, height: 120, boxShadow: 3, border: '4px solid #fff', bgcolor: '#f5e7d6', fontSize: 48 }}
        />
        <Button variant="text" onClick={onAvatarChange} sx={{ mt: 1, color: '#1976d2', fontWeight: 600 }}>
          Edit picture or avatar
        </Button>
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          id="edit-avatar-input"
          onChange={e => setNewAvatarFile(e.target.files[0])}
        />
      </Box>
      <Box width="100%" maxWidth={400}>
        <TextField label="Name" value={name} onChange={e => setName(e.target.value)} fullWidth margin="normal" />
        <TextField 
          label="Username" 
          value={username} 
          onChange={e => {
            const value = e.target.value;
            setUsername(value);
            // Basic validation
            if (value.length > 0 && value.length < 3) {
              setUsernameError('Username must be at least 3 characters');
            } else if (value.length > 20) {
              setUsernameError('Username must be less than 20 characters');
            } else if (value.length > 0 && !/^[a-zA-Z0-9_]+$/.test(value)) {
              setUsernameError('Username can only contain letters, numbers, and underscores');
            } else {
              setUsernameError('');
            }
          }} 
          fullWidth 
          margin="normal"
          error={!!usernameError}
          helperText={usernameError}
        />
        <TextField label="Pronouns" value={pronouns} onChange={e => setPronouns(e.target.value)} fullWidth margin="normal" />
        <TextField label="Bio" value={bio} onChange={e => setBio(e.target.value)} fullWidth margin="normal" multiline rows={3} />
        <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
          <span style={{ fontWeight: 500 }}>Show Online Status</span>
          <Switch
            checked={showOnlineStatus}
            onChange={() => setShowOnlineStatus(v => !v)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#1976d2',
                '& + .MuiSwitch-track': { backgroundColor: '#1976d2' },
              },
              '& .MuiSwitch-switchBase': {
                color: '#222',
                '& + .MuiSwitch-track': { backgroundColor: '#bbb' },
              },
            }}
          />
        </Box>
      </Box>
      <Box display="flex" gap={2} mt={4}>
        <Button onClick={onClose} color="secondary" variant="outlined">Cancel</Button>
        <Button onClick={onSave} color="primary" variant="contained">Save</Button>
      </Box>
    </Box>
  </Dialog>
);

export default function UserProfilePage({ address, onFollowChange, personalKey }) {
  const [ens, setEns] = useState('');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [bio, setBio] = useState('');
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0, joined: '', soc: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [editMode, setEditMode] = useState(false);
  const [socBalance, setSocBalance] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentAccount, setCurrentAccount] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [settingUsername, setSettingUsername] = useState(false);
  const router = useRouter();
  const [drawerMode, setDrawerMode] = useState('menu'); // 'menu' or 'edit'
  const [allPosts, setAllPosts] = useState([]);

  useEffect(() => {
    async function detectAccount() {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          setCurrentAccount(accounts[0].toLowerCase());
        }
      }
    }
    detectAccount();
  }, []);

  useEffect(() => {
    const isOwn = address && currentAccount && address.toLowerCase() === currentAccount.toLowerCase();
    setIsOwnProfile(isOwn);
  }, [address, currentAccount]);

  useEffect(() => {
    setLoading(true); // Start loading before fetch
    async function fetchData() {
      try {
        if (!address || !window.ethereum) return;
        const provider = new ethers.BrowserProvider(window.ethereum);
        // ENS
        const ensName = await lookupENS(address);
        setEns(ensName);
        // Contract
        const contract = new ethers.Contract(contractAddress, PostContractAbi.abi, provider);
        // Username
        const uname = await contract.usernames(address);
        setUsername(uname);
        setOriginalUsername(uname);
        // Bio
        const userBio = await contract.bios(address);
        setBio(userBio);
        // Posts
        const postCount = Number(await contract.postCount());
        const userPosts = [];
        const liked = [];
        const allPostsArr = [];
        // Get user's liked posts
        const likedPostIds = await contract.getLikedPosts(address);
        for (let i = 1; i <= postCount; i++) {
          const postIdBN = ethers.toBigInt(i);
          const post = await contract.posts(postIdBN);
          // All posts (for likes tab)
          const postObj = {
            id: post.id.toString(),
            type: post.contentHash.endsWith('.mp4') ? 'video' : 'image',
            src: `/api/media/${post.author.toLowerCase()}/posts/${post.contentHash}`,
            author: post.author,
            contentHash: post.contentHash,
            timestamp: new Date(Number(post.timestamp) * 1000).toLocaleString(),
            likeCount: Number(await contract.postLikeCount(postIdBN)),
            isLiked: false,
          };
          allPostsArr.push(postObj);
          if (post.author.toLowerCase() === address.toLowerCase()) {
            userPosts.push({ ...postObj, isLiked: await contract.isLiked(postIdBN, address) });
          }
        }
        for (const postIdRaw of likedPostIds) {
          const postIdBN = ethers.toBigInt(postIdRaw);
          const post = await contract.posts(postIdBN);
          const likeCount = Number(await contract.postLikeCount(postIdBN));
          liked.push({
            id: post.id.toString(),
            type: post.contentHash.endsWith('.mp4') ? 'video' : 'image',
            src: `/api/media/${post.author.toLowerCase()}/posts/${post.contentHash}`,
            author: post.author,
            contentHash: post.contentHash,
            timestamp: new Date(Number(post.timestamp) * 1000).toLocaleString(),
            likeCount,
            isLiked: true,
          });
        }
        // Filter out posts whose media file does not exist
        const filteredUserPosts = await Promise.all(
          userPosts.map(async (post) => {
            try {
              // Add timeout to prevent hanging requests
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
              const res = await fetch(post.src, { method: 'HEAD', signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) return post;
            } catch (e) {}
            return null;
          })
        );
        const filteredLiked = await Promise.all(
          liked.map(async (post) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              const res = await fetch(post.src, { method: 'HEAD', signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) return post;
            } catch (e) {}
            return null;
          })
        );
        // Filter allPostsArr for valid media
        const filteredAllPosts = await Promise.all(
          allPostsArr.map(async (post) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              const res = await fetch(post.src, { method: 'HEAD', signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) return post;
            } catch (e) {}
            return null;
          })
        );
        setPosts(filteredUserPosts.filter(Boolean));
        setLikedPosts(filteredLiked.filter(Boolean));
        setAllPosts(filteredAllPosts.filter(Boolean));
        // Stats
        const statsData = await getUserStats(address);
        setStats(statsData);
        // Following list
        const following = await contract.getFollowing(address);
        setFollowingList(following);
        // SOC token balance
        const tokenContract = new ethers.Contract(tokenAddress, SocialTokenAbi.abi, provider);
        const socBal = await tokenContract.balanceOf(address);
        setSocBalance(Number(ethers.formatEther(socBal)));
        // Check if current user is following this profile (only if currentAccount is set)
        if (currentAccount) {
          const isF = await contract.isFollowing(currentAccount, address);
          setIsFollowing(isF);
        } else {
          setIsFollowing(false);
        }
      } catch (err) {
        setEns('');
        setUsername('');
        setBio('');
        setPosts([]);
        setStats({ posts: 0, followers: 0, following: 0, joined: '', soc: 0 });
        setLikedPosts([]);
        setFollowingList([]);
        setSocBalance(0);
        setIsFollowing(false);
        setTransfers([]);
        setAllPosts([]);
      } finally {
        setLoading(false); // Only stop loading after filtering is done
      }
    }
    fetchData();
  }, [address, currentAccount, refreshKey]);

  useEffect(() => {
    if (
      address &&
      currentAccount &&
      address.toLowerCase() === currentAccount.toLowerCase()
    ) {
      fetchTransfers();
    }
  }, [address, currentAccount]);

  useEffect(() => {
    // Load avatar from localStorage (for demo)
    if (address) {
      const key = `avatar_${address.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const validatedUrl = validateAvatarUrl(stored, address);
        setAvatarUrl(validatedUrl);
        // Update localStorage with corrected URL if needed
        if (validatedUrl && validatedUrl !== stored) {
          localStorage.setItem(key, validatedUrl);
        }
      } else {
        setAvatarUrl('');
      }
    }
    function handleAvatarUpdate() {
      if (address) {
        const key = `avatar_${address.toLowerCase()}`;
        const stored = localStorage.getItem(key);

        if (stored) {
          const validatedUrl = validateAvatarUrl(stored, address);
          
          setAvatarUrl(validatedUrl);
          // Update localStorage with corrected URL if needed
          if (validatedUrl && validatedUrl !== stored) {
            localStorage.setItem(key, validatedUrl);

          }
        } else {
          
          setAvatarUrl('');
        }
      }
    }
    window.addEventListener('avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdate);
  }, [address]);

  // Fetch SOC token transfers
  async function fetchTransfers() {
    try {
      if (!address || !window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(tokenAddress, SocialTokenAbi.abi, provider);
      
      // Get Transfer events where this address is sender or receiver
      const filterFrom = tokenContract.filters.Transfer(address, null);
      const filterTo = tokenContract.filters.Transfer(null, address);
      
      const [sentEvents, receivedEvents] = await Promise.all([
        tokenContract.queryFilter(filterFrom),
        tokenContract.queryFilter(filterTo)
      ]);
      
      const transfers = [];
      
      // Process sent transfers
      sentEvents.forEach(event => {
        transfers.push({
          type: 'sent',
          to: event.args.to,
          amount: ethers.formatEther(event.args.value),
          timestamp: new Date(Number(event.blockNumber) * 1000).toLocaleString(),
          txHash: event.transactionHash
        });
      });
      
      // Process received transfers
      receivedEvents.forEach(event => {
        transfers.push({
          type: 'received',
          from: event.args.from,
          amount: ethers.formatEther(event.args.value),
          timestamp: new Date(Number(event.blockNumber) * 1000).toLocaleString(),
          txHash: event.transactionHash
        });
      });
      
      // Sort by timestamp (newest first)
      transfers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setTransfers(transfers);
    } catch (error) {
      setTransfers([]);
    }
  }

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        window.location.reload();
      }
    };
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  // Fetch all posts for Likes tab (always call this hook, but only run logic if activeTab === 'likes' and isOwnProfile)
  useEffect(() => {
    async function fetchAllPostsAndLikes() {
      if (!currentAccount || activeTab !== 'likes' || !isOwnProfile) return;
      try {
        if (!window.ethereum) return;
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, PostContractAbi.abi, provider);
        const postCount = Number(await contract.postCount());
        const postsArr = [];
        for (let i = 1; i <= postCount; i++) {
          const post = await contract.posts(i);
          postsArr.push({
            id: post.id.toString(),
            type: post.contentHash.endsWith('.mp4') ? 'video' : 'image',
            src: `/api/media/${post.author.toLowerCase()}/posts/${post.contentHash}`,
            author: post.author,
            contentHash: post.contentHash,
            timestamp: new Date(Number(post.timestamp) * 1000).toLocaleString(),
          });
        }
        // Filter for media existence
        const filteredPosts = await Promise.all(postsArr.map(async post => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(post.src, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) return post;
          } catch {}
          return null;
        }));
        const validPosts = filteredPosts.filter(Boolean);
        setAllPosts(validPosts);
        // Now check likes for each post
        const liked = [];
        await Promise.all(validPosts.map(async post => {
          try {
            const res = await fetch(`/api/likes?address=${post.author.toLowerCase()}&postId=${post.contentHash}&user=${currentAccount}`);
            if (res.ok) {
              const data = await res.json();
              if (data.likedByUser) liked.push(post);
            }
          } catch {}
        }));
        setLikedPosts(liked);
      } catch {}
    }
    fetchAllPostsAndLikes();
  }, [activeTab, isOwnProfile, currentAccount, refreshKey]);

  if (loading) return <div className="text-center py-12 text-lg text-gray-400">Loading profile...</div>;

  // Remove Edit Profile tab
  const tabs = [
    { key: 'posts', label: 'Posts' },
    ...(isOwnProfile ? [{ key: 'likes', label: 'Likes' }] : []),
    ...(isOwnProfile ? [{ key: 'transfers', label: 'Transfers' }] : []),
    { key: 'following', label: 'Following' },
  ];

  async function handleSaveProfile() {
    try {
      // Set username if provided and changed
      if (isOwnProfile && username && username !== originalUsername) {
        setSettingUsername(true);
        try {
          // Call blockchain setUsername function
          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(contractAddress, PostContractAbi.abi, signer);
            
            const tx = await contract.setUsername(username.trim());
            await tx.wait();
            
            setOriginalUsername(username);
            toast.success('Username updated on blockchain!');
          } else {
            // Fallback to file-based storage if no wallet
            const usernameResponse = await fetch('/api/setUsername', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                address: address.toLowerCase(),
                username: username.trim()
              })
            });

            if (!usernameResponse.ok) {
              const errorData = await usernameResponse.json();
              throw new Error(errorData.error || 'Failed to set username');
            }

            setOriginalUsername(username);
            toast.success('Username updated (file-based)!');
          }
        } catch (error) {
          console.error('Error setting username:', error);
          toast.error(error.message || 'Failed to set username');
          setSettingUsername(false);
          return;
        } finally {
          setSettingUsername(false);
        }
      }

      // Profile picture upload
      if (newAvatarFile) {
        // Upload to /profile/ subfolder
        const formData = new FormData();
        formData.append('file', newAvatarFile);
        const res = await fetch(`/api/upload?wallet=${address.toLowerCase()}&type=profile`, {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        const url = `/api/media/${address.toLowerCase()}/profile/${data.filename}?t=${Date.now()}`;
        setAvatarUrl(url);
        localStorage.setItem(`avatar_${address.toLowerCase()}`, url);
        window.dispatchEvent(new Event('avatar-updated'));
        toast.success('Profile picture updated!');
      }
      setEditMode(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error('Failed to update profile');
    }
  }

  // Demo logic for online status: even last digit = online, odd = offline
  const computedOnline = address && /[0-9a-fA-F]$/.test(address) ? (parseInt(address.slice(-1), 16) % 2 === 0) : false;
  const isOnline = showOnlineStatus ? computedOnline : false;

  async function handleDeletePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    try {
      const res = await fetch('/api/deletePost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, contentHash: post.contentHash })
      });
      if (!res.ok) throw new Error('Failed to delete post');
      toast.success('Post deleted!');
      // Remove the post from local state immediately to prevent 404 errors
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
      setLikedPosts(prevLiked => prevLiked.filter(p => p.id !== postId));
      // Also refresh to get updated stats
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error deleting post:', err);
      toast.error('Failed to delete post');
    }
  }

  function shareProfile() {
    const url = `${window.location.origin}/profile/${address}`;
    navigator.clipboard.writeText(url);
    toast.success('Profile link copied!');
  }

  function handleCopy() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }
    } catch (error) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }

  return (
    <Box minHeight="100vh" bgcolor="#fdf6f0" pb={8} position="relative">
      {/* Home button (top left) */}
      <Box position="fixed" top={16} left={16} zIndex={50}>
        <IconButton
          onClick={() => router.push('/')}
          sx={{ width: 48, height: 48, bgcolor: '#eee', boxShadow: 2, '&:hover': { bgcolor: '#e0e0e0' } }}
          title="Home"
        >
          <HomeIcon sx={{ color: '#e48a3a', fontSize: 32 }} />
        </IconButton>
      </Box>
      {/* Hamburger menu (top right) if viewing own profile */}
      {isOwnProfile && !editMode && (
        <Box position="absolute" top={24} right={24}>
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{ bgcolor: '#eee', boxShadow: 2, '&:hover': { bgcolor: '#e0e0e0' } }}
            title="Menu"
          >
            <MenuIcon sx={{ color: '#e48a3a', fontSize: 32 }} />
          </IconButton>
        </Box>
      )}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerMode('menu'); }}
        PaperProps={{
          sx: {
            width: 400,
            background: 'rgba(255,255,255,0.35)',
            backdropFilter: 'blur(32px)',
            boxShadow: '0 8px 32px 0 rgba(31,38,135,0.10)',
            borderRadius: 4,
            border: '1.5px solid #fff',
            bgcolor: '#fdf6f0',
            overflow: 'hidden',
          }
        }}
      >
        <Box role="presentation" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Fade in={drawerMode === 'menu'} timeout={400} unmountOnExit>
            <Box>
              <Typography variant="h6" fontWeight={700} mb={2} align="center">
                Menu
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><EditIcon color="warning" /></ListItemIcon>
                  <ListItemText primary="Edit Profile" onClick={() => setDrawerMode('edit')} sx={{ cursor: 'pointer' }} />
                </ListItem>
              </List>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={600} mb={1} align="center">
                Privacy & Security
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><SecurityIcon color="warning" /></ListItemIcon>
                  <ListItemText primary="Show Online Status" />
                  <IOSSwitch
                    checked={showOnlineStatus}
                    onChange={() => setShowOnlineStatus(v => !v)}
                  />
                </ListItem>
              </List>
            </Box>
          </Fade>
          <Fade in={drawerMode === 'edit'} timeout={400} unmountOnExit>
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
              <IconButton onClick={() => setDrawerMode('menu')} sx={{ alignSelf: 'flex-start', mb: 2 }}>
                <ArrowBackIcon />
              </IconButton>
              <Box width="100%" maxWidth={340} mx="auto">
                <Avatar
                  src={newAvatarFile ? URL.createObjectURL(newAvatarFile) : avatarUrl}
                  alt="avatar"
                  sx={{ width: 100, height: 100, boxShadow: 3, border: '4px solid #fff', bgcolor: '#f5e7d6', fontSize: 48, mx: 'auto', mb: 2 }}
                />
                <Button variant="text" onClick={() => document.getElementById('edit-avatar-input').click()} sx={{ color: '#1976d2', fontWeight: 600, mb: 2 }}>
                  Edit picture or avatar
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="edit-avatar-input"
                  onChange={e => setNewAvatarFile(e.target.files[0])}
                />
                <TextField label="Name" value={name} onChange={e => setName(e.target.value)} fullWidth margin="normal" />
                <TextField 
                  label="Username" 
                  value={username} 
                  onChange={e => {
                    const value = e.target.value;
                    setUsername(value);
                    // Basic validation
                    if (value.length > 0 && value.length < 3) {
                      setUsernameError('Username must be at least 3 characters');
                    } else if (value.length > 20) {
                      setUsernameError('Username must be less than 20 characters');
                    } else if (value.length > 0 && !/^[a-zA-Z0-9_]+$/.test(value)) {
                      setUsernameError('Username can only contain letters, numbers, and underscores');
                    } else {
                      setUsernameError('');
                    }
                  }} 
                  fullWidth 
                  margin="normal"
                  error={!!usernameError}
                  helperText={usernameError}
                />
                <TextField label="Pronouns" value={pronouns} onChange={e => setPronouns(e.target.value)} fullWidth margin="normal" />
                <TextField label="Bio" value={bio} onChange={e => setBio(e.target.value)} fullWidth margin="normal" multiline rows={3} />
                <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
                  <span style={{ fontWeight: 500 }}>Show Online Status</span>
                  <IOSSwitch
                    checked={showOnlineStatus}
                    onChange={() => setShowOnlineStatus(v => !v)}
                  />
                </Box>
                <Box display="flex" gap={2} mt={4}>
                  <Button onClick={() => setDrawerMode('menu')} color="secondary" variant="outlined">Cancel</Button>
                  <Button 
                    onClick={handleSaveProfile} 
                    color="primary" 
                    variant="contained"
                    disabled={settingUsername}
                  >
                    {settingUsername ? 'Setting Username...' : 'Save'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Fade>
        </Box>
      </Drawer>
      <UserStats
        ens={ens || username || address}
        username={username ? `@${username}` : ''}
        bio={bio}
        isFollowing={isFollowing}
        onFollow={() => toggleFollowUser(address, isFollowing)}
        onTip={() => tipAuthor(address)}
        onShare={shareProfile}
        hideActions={isOwnProfile}
        avatarUrl={avatarUrl}
        isOnline={isOnline}
        onChangeAvatar={() => setAvatarDialogOpen(true)}
      />
      <Dialog 
        open={avatarDialogOpen} 
        onClose={() => setAvatarDialogOpen(false)}
        disableEnforceFocus
        disableAutoFocus
        PaperProps={{
          sx: {
            background: 'rgba(255,255,255,0.25)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px 0 rgba(31,38,135,0.37)',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.18)'
          }
        }}
      >
        <DialogTitle>Change Profile Picture</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            {newAvatarFile ? (
              <img src={URL.createObjectURL(newAvatarFile)} alt="avatar preview" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 48 }}>🖼️</span>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={e => setNewAvatarFile(e.target.files[0])}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAvatarDialogOpen(false)} color="secondary">Cancel</Button>
          <Button onClick={async () => { await handleSaveProfile(); setAvatarDialogOpen(false); }} color="warning" variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      {/* Wallet address with copy and share icons */}
      <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={2} mt={2}>
        <Box display="flex" alignItems="center" position="relative">
          <IconButton
            onClick={handleCopy}
            sx={{ mr: 1, bgcolor: copied ? '#e0f7fa' : '#f5f5f5', '&:hover': { bgcolor: '#b2ebf2' }, p: 1 }}
            title="Copy address"
          >
            {copied ? (
              <svg width="20" height="20" fill="none" stroke="#43a047" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="#757575" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>
            )}
          </IconButton>
        </Box>
        <Typography fontFamily="monospace" fontSize={14} color="text.secondary" sx={{ userSelect: 'all' }}>
          {address}
        </Typography>
        <IconButton
          onClick={shareProfile}
          sx={{ ml: 1, bgcolor: '#f5f5f5', '&:hover': { bgcolor: '#ffe0b2' }, p: 1 }}
          title="Share profile"
        >
          <ShareIcon sx={{ color: '#e48a3a' }} />
        </IconButton>
      </Box>
      {/* Stats bar above tab content, small font */}
      {isOwnProfile && <UserProfileStatsBar joined={stats.joined || ''} posts={posts.length} soc={socBalance} />}
      {/* Tabs navigation */}
      <Box display="flex" justifyContent="center" mb={4} borderBottom="1px solid #f5e7d6">
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          textColor="warning"
          indicatorColor="warning"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 48 }}
          TabIndicatorProps={{
            style: {
              height: 4,
              borderRadius: 2,
              background: '#e48a3a',
              transition: 'all 0.35s cubic-bezier(.4,1.3,.6,1)',
            }
          }}
        >
          {tabs.map(tab => (
            <Tab
              key={tab.key}
              value={tab.key}
              label={tab.label}
              sx={{
                fontWeight: 600,
                fontSize: '1.1rem',
                fontFamily: 'Poppins, sans-serif',
                minWidth: 100,
              }}
            />
          ))}
        </Tabs>
      </Box>
      {/* Post grid and tabs */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={320} mt={6}>
          <CircularProgress color="warning" size={64} />
        </Box>
      ) : (
        <>
          {activeTab === 'posts' && (
            <UserPostGrid
              posts={posts}
              isOwnProfile={isOwnProfile}
              onDelete={handleDeletePost}
              personalKey={personalKey}
            />
          )}
          {activeTab === 'likes' && (
            <UserPostGrid
              posts={likedPosts}
              isOwnProfile={false}
              onDelete={() => {}}
              personalKey={personalKey}
            />
          )}
        </>
      )}
      {activeTab === 'following' && (
        <div className="flex flex-col items-center gap-4 mt-8">
          {followingList.length === 0 ? (
            <div className="text-gray-400">Not following anyone yet.</div>
          ) : (
            followingList
              .filter(f => !currentAccount || f.toLowerCase() !== currentAccount.toLowerCase()) // Filter out current user
              .map(f => {
                let avatar = '';
                if (typeof window !== 'undefined') {
                  avatar = localStorage.getItem(`avatar_${f.toLowerCase()}`) || '';
                }
                return (
                  <button
                    key={f}
                    onClick={() => router.push(`/profile/${f}`)}
                    className="flex items-center gap-4 p-4 bg-white rounded-lg shadow w-full max-w-md hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {avatar ? (
                      <img 
                        src={avatar} 
                        className="w-12 h-12 rounded-full object-cover" 
                        alt="avatar"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('[data-fallback]');
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    {!avatar && (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <img 
                          src="https://via.placeholder.com/150/6366f1/ffffff?text=User" 
                          alt="default avatar" 
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            // If default avatar fails, show gradient with initial
                            e.target.style.display = 'none';
                            const fallback = e.target.parentElement.querySelector('[data-fallback]');
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                        <div 
                          data-fallback="true"
                          className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e48a3a] to-[#f7a76c] flex items-center justify-center text-white font-bold text-lg hidden"
                        >
                          {f.slice(0, 1).toUpperCase()}
                        </div>
                      </div>
                    )}
                    <span className="font-semibold">{f.slice(0, 6)}...{f.slice(-4)}</span>
                  </button>
                );
              })
          )}
        </div>
      )}
      {activeTab === 'transfers' && (
        <div className="flex flex-col items-center gap-4 mt-8">
          {transfers.length === 0 ? (
            <div className="text-gray-400">No transfers yet.</div>
          ) : (
            <div className="w-full max-w-2xl">
              {transfers.map((transfer, index) => (
                <div
                  key={`${transfer.txHash}-${index}`}
                  className={`flex items-center justify-between p-4 mb-3 rounded-lg shadow ${
                    transfer.type === 'sent' 
                      ? 'bg-red-50 border-l-4 border-red-400' 
                      : 'bg-green-50 border-l-4 border-green-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transfer.type === 'sent' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {transfer.type === 'sent' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m0 0l-7-7m7 7l7-7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {transfer.type === 'sent' ? 'Sent to' : 'Received from'}
                      </div>
                      <div className="text-sm text-gray-600 font-mono">
                        {transfer.type === 'sent' 
                          ? `${transfer.to.slice(0, 6)}...${transfer.to.slice(-4)}`
                          : `${transfer.from.slice(0, 6)}...${transfer.from.slice(-4)}`
                        }
                      </div>
                      <div className="text-xs text-gray-500">{transfer.timestamp}</div>
                    </div>
                  </div>
                  <div className={`text-right ${
                    transfer.type === 'sent' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    <div className="font-bold text-lg">
                      {transfer.type === 'sent' ? '-' : '+'}{transfer.amount} SOC
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Box>
  );
} 