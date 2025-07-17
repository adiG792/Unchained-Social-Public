import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import WalletConnect from '../components/WalletConnect';
import PostForm from '../components/PostForm';
import Feed from '../components/Feed';
import TokenBalance from '../components/TokenBalance';
import PostContractAbi from '../abis/PostContract.json';
import TokenAbi from '../abis/SocialToken.json';
import contracts from '../src/contracts.json';
import { useRouter } from 'next/router';
import UserSearch from '../components/UserSearch';
import UserProfilePage from '../components/UserProfilePage';
import StoryBar from '../components/StoryBar';
import StoryModal from '../components/StoryModal';
import LoginModal from '../components/LoginModal';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Avatar, Typography, IconButton, Badge, Paper, Switch, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, CircularProgress, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ExploreIcon from '@mui/icons-material/Explore';
import MessageIcon from '@mui/icons-material/Message';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AddBoxIcon from '@mui/icons-material/AddBox';
import PersonIcon from '@mui/icons-material/Person';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SecurityIcon from '@mui/icons-material/Security';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Demo: local usernames list for autocomplete (replace with backend for production)
const usernamesList = [
  // Example: { username: 'alice', address: '0x123...' },
  // You can populate this with real data or fetch from a backend
];

export default function Home() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [reloadBalance, setReloadBalance] = useState(false);
  const [reloadFeed, setReloadFeed] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [myUsername, setMyUsername] = useState("");
  const router = useRouter();
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState(null);
  const [stories, setStories] = useState([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    // Load active tab from localStorage on component mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeTab');
      return saved || 'home';
    }
    return 'home';
  }); // 'home', 'search', 'explore', 'messages', 'notifications', 'create', 'profile', 'more'
  const [recentSearches, setRecentSearches] = useState([]);
  
  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab]);
  
  // Login state
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [personalKey, setPersonalKey] = useState(null);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

  const contractAddress = contracts.PostContract;
  const tokenAddress = contracts.SocialToken;

  // Auto-connect wallet
  useEffect(() => {
    async function getAccount() {
      if (!window.ethereum) return;

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const currentAccount = accounts[0];
        setAccount(currentAccount);
        
        // Check if user is already authenticated
        const storedKey = sessionStorage.getItem(`personalKey_${currentAccount.toLowerCase()}`);
        if (storedKey) {
          setPersonalKey(storedKey);
          setIsAuthenticated(true);
        } else {
          // Show login modal for new account
          setLoginModalOpen(true);
        }
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      }

      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setIsAuthenticated(false);
          setPersonalKey(null);
          // Clear session storage
          sessionStorage.clear();
          // Reload page when disconnecting
          window.location.reload();
        } else {
          const newAccount = accounts[0];
          setAccount(newAccount);
          
          // Check if new account is authenticated
          const storedKey = sessionStorage.getItem(`personalKey_${newAccount.toLowerCase()}`);
          if (storedKey) {
            setPersonalKey(storedKey);
            setIsAuthenticated(true);
          } else {
            // Show login modal for new account
            setLoginModalOpen(true);
          }
          
          // Reload page when switching accounts
          window.location.reload();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    getAccount();

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

  // Handle login success
  const handleLoginSuccess = (key) => {
    setPersonalKey(key);
    setIsAuthenticated(true);
    setLoginModalOpen(false);
  };

  // Handle login close
  const handleLoginClose = () => {
    setLoginModalOpen(false);
    // If user cancels login, disconnect wallet
    if (!isAuthenticated) {
      setAccount(null);
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (!newPassword || !confirmNewPassword || !currentPassword) {
      setPasswordChangeError('All fields are required');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordChangeError('New password must be at least 8 characters');
      return;
    }

    setPasswordChangeLoading(true);
    setPasswordChangeError('');

    try {
      // First verify current password
      const verifyResponse = await fetch('/api/verifyPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: account.toLowerCase(),
          password: currentPassword
        })
      });

      if (!verifyResponse.ok) {
        setPasswordChangeError('Current password is incorrect');
        return;
      }

      // Set new password
      const setResponse = await fetch('/api/setPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: account.toLowerCase(),
          password: newPassword
        })
      });

      if (setResponse.ok) {
        // Get new personal key
        const newVerifyResponse = await fetch('/api/verifyPassword', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: account.toLowerCase(),
            password: newPassword
          })
        });

        if (newVerifyResponse.ok) {
          const { personalKey: newPersonalKey } = await newVerifyResponse.json();
          
          // Update personal key in session storage
          sessionStorage.setItem(`personalKey_${account.toLowerCase()}`, newPersonalKey);
          setPersonalKey(newPersonalKey);
          
          // Close dialog and show success
          setChangePasswordDialogOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
          toast.success('Password changed successfully!');
        } else {
          setPasswordChangeError('Failed to generate new encryption key');
        }
      } else {
        setPasswordChangeError('Failed to update password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordChangeError('Network error. Please try again.');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleCloseChangePasswordDialog = () => {
    setChangePasswordDialogOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordChangeError('');
    setPasswordChangeLoading(false);
  };

  // Fetch my username after login
  useEffect(() => {
    async function fetchMyUsername() {
      if (!account || !window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, PostContractAbi.abi, provider);
      const name = await contract.usernames(account);
      setMyUsername(name);
    }
    fetchMyUsername();
  }, [account, contractAddress]);

  // Fetch avatar
    useEffect(() => {
      if (account) {
      const stored = localStorage.getItem(`avatar_${account.toLowerCase()}`);
        if (stored) setAvatarUrl(stored);
      }
    }, [account]);
  useEffect(() => {
    function handleAvatarUpdate() {
      if (account) {
        const stored = localStorage.getItem(`avatar_${account.toLowerCase()}`);
        setAvatarUrl(stored || '');
      }
    }
    window.addEventListener('avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdate);
  }, [account]);

  // Sidebar navigation items
  const navItems = [
    { key: 'home', label: 'Home', icon: <HomeIcon /> },
    { key: 'search', label: 'Search', icon: <SearchIcon /> },
    { key: 'explore', label: 'Explore', icon: <ExploreIcon /> },
    { key: 'messages', label: 'Messages', icon: <Badge badgeContent={1} color="error"><MessageIcon /></Badge> },
    { key: 'notifications', label: 'Notifications', icon: <NotificationsIcon /> },
    { key: 'create', label: 'Create', icon: <AddBoxIcon /> },
    { key: 'profile', label: 'Profile', icon: avatarUrl ? <Avatar src={avatarUrl} sx={{ width: 28, height: 28 }} /> : <PersonIcon /> },
    { key: 'more', label: 'More', icon: <MoreHorizIcon /> },
  ];

  // Story modal navigation handlers
  useEffect(() => {
    fetch('/api/stories').then(res => res.json()).then(setStories);
  }, []);
  const handleStoryClick = (story, idx) => {
    setSelectedStory(story);
    setStoryIndex(idx);
    setStoryModalOpen(true);
  };
  const handlePrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      setSelectedStory(stories[storyIndex - 1]);
    }
  };
  const handleNextStory = () => {
    if (storyIndex < stories.length - 1) {
      setStoryIndex(storyIndex + 1);
      setSelectedStory(stories[storyIndex + 1]);
    }
  };

  // Search logic (demo recents)
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setRecentSearches(prev => [{ username: search, avatar: '', name: search }, ...prev.filter(s => s.username !== search)]);
    setSearch("");
  };
  const handleClearRecent = () => setRecentSearches([]);
  const handleRemoveRecent = (username) => setRecentSearches(prev => prev.filter(s => s.username !== username));

  // Main content rendering
  let mainContent = null;
  
  if (!account) {
    mainContent = (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
        <Typography variant="h4" fontWeight={700} color="#e48a3a" mb={3}>
          Welcome to Unchained Social
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4} textAlign="center">
          Connect your wallet to start sharing moments with the world
        </Typography>
        <WalletConnect setAccount={setAccount} setChainId={setChainId} />
      </Box>
    );
  } else if (!isAuthenticated) {
    mainContent = (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
        <Typography variant="h4" fontWeight={700} color="#e48a3a" mb={3}>
          Authentication Required
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4} textAlign="center">
          Please complete the login process to access your encrypted data
        </Typography>
      </Box>
    );
  } else {
    // User is authenticated - show content based on active tab
    if (activeTab === 'home') {
      mainContent = (
        <>
          <StoryBar account={account} onStoryClick={handleStoryClick} />
          <Box width="100%" maxWidth={600}>
          <Feed
            contractAddress={contractAddress}
            abi={PostContractAbi.abi}
            tokenAddress={tokenAddress}
            tokenAbi={TokenAbi.abi}
              activeMode="feed"
              personalKey={personalKey}
            />
          </Box>
        </>
      );
    } else if (activeTab === 'search') {
      mainContent = (
        <Box width="100%" maxWidth={600} bgcolor="#fff" borderRadius={4} boxShadow={2} p={4} mt={4}>
          <Typography variant="h5" fontWeight={700} mb={2}>Search Users</Typography>
          <UserSearch />
        </Box>
      );
    } else if (activeTab === 'explore') {
      mainContent = (
        <>
          <StoryBar account={account} onStoryClick={handleStoryClick} />
          <Box width="100%" maxWidth={600}>
            <Feed
              contractAddress={contractAddress}
              abi={PostContractAbi.abi}
              tokenAddress={tokenAddress}
              tokenAbi={TokenAbi.abi}
              activeMode="explore"
              personalKey={personalKey}
            />
          </Box>
        </>
      );
    } else if (activeTab === 'create') {
      mainContent = (
        <Box width="100%" maxWidth={600} sx={{ p: 3 }}>
          <PostForm 
            account={account} 
            contractAddress={contractAddress} 
            setReloadFeed={setReloadFeed}
            personalKey={personalKey}
          />
        </Box>
      );
    } else if (activeTab === 'profile') {
      mainContent = (
        <Box width="100%" maxWidth={600}>
          <UserProfilePage address={account} personalKey={personalKey} />
        </Box>
      );
    } else if (activeTab === 'more') {
      mainContent = (
        <Box width="100%" maxWidth={600} sx={{ p: 3 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              borderRadius: 3,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#e48a3a" mb={3}>
              Privacy Settings
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Online Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Show Online Status
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Let others see when you're active
                  </Typography>
                </Box>
                <Switch
                  checked={showOnlineStatus}
                  onChange={(e) => setShowOnlineStatus(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#e48a3a',
                      '& + .MuiSwitch-track': { backgroundColor: '#e48a3a' },
                    },
                    '& .MuiSwitch-switchBase': {
                      color: '#666',
                      '& + .MuiSwitch-track': { backgroundColor: '#ccc' },
                    },
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Data Encryption
              </Typography>
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body1" fontWeight={500} mb={1}>
                  Personal Encryption Key
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Your data is encrypted with your personal key, separate from your MetaMask wallet.
                </Typography>
                <Chip 
                  label="Active" 
                  color="success" 
                  size="small"
                  icon={<SecurityIcon />}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Account Security
              </Typography>
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="body1" fontWeight={500} mb={1}>
                  Password Protection
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Your password is encrypted and stored securely on the server.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip 
                    label="Protected" 
                    color="success" 
                    size="small"
                    icon={<LockIcon />}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setChangePasswordDialogOpen(true)}
                    sx={{ 
                      borderColor: '#e48a3a', 
                      color: '#e48a3a',
                      '&:hover': { 
                        borderColor: '#d17a2a', 
                        bgcolor: 'rgba(228, 138, 58, 0.1)' 
                      }
                    }}
                  >
                    Change Password
                  </Button>
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Privacy Features
              </Typography>
              <List>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Encrypted Posts" 
                    secondary="All your posts are encrypted with your personal key"
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Encrypted Comments" 
                    secondary="Comments are encrypted and only visible to you"
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Account Isolation" 
                    secondary="Each wallet address has separate encryption"
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Session Security" 
                    secondary="Keys are cleared when you disconnect"
                  />
                </ListItem>
              </List>
            </Box>
          </Paper>
        </Box>
      );
    } else {
      mainContent = (
        <Box width="100%" maxWidth={600} display="flex" alignItems="center" justifyContent="center" minHeight={400}>
          <Typography variant="h6" color="text.secondary">Coming soon...</Typography>
        </Box>
      );
    }
  }

  return (
    <Box display="flex" minHeight="100vh" bgcolor="#faf6f2">
      {/* Left Sidebar - Only show when authenticated */}
      {isAuthenticated && (
        <Drawer
          variant="permanent"
          anchor="left"
          PaperProps={{
            sx: {
              width: 260,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(24px)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              boxShadow: '0 8px 32px 0 rgba(31,38,135,0.10)',
              pt: 2,
            },
          }}
          sx={{ zIndex: 1200 }}
        >
          <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
            <Typography variant="h4" fontWeight={900} color="#e48a3a" fontFamily="Poppins, sans-serif" mb={2} letterSpacing={2}>
              US
            </Typography>
          </Box>
          <List>
            {navItems.map(item => (
              <ListItem
                key={item.key}
                selected={activeTab === item.key}
                onClick={() => setActiveTab(item.key)}
                sx={{
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: activeTab === item.key ? '#f5f5f5' : 'transparent',
                  fontWeight: activeTab === item.key ? 700 : 500,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: activeTab === item.key ? 700 : 500,
                    fontSize: 18,
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Drawer>
      )}

      {/* Main Feed/Search/Profile Area */}
      <Box flex={1} display="flex" flexDirection="column" alignItems="center" px={2}>
        {mainContent}
      </Box>

      {/* No right sidebar */}
      {/* Story Modal with navigation */}
      <StoryModal
        open={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        story={selectedStory}
        onPrev={handlePrevStory}
        onNext={handleNextStory}
        hasPrev={storyIndex > 0}
        hasNext={storyIndex < stories.length - 1}
      />

             {/* Login Modal */}
       <LoginModal
         open={loginModalOpen}
         onClose={handleLoginClose}
         address={account}
         onLoginSuccess={handleLoginSuccess}
       />

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordDialogOpen}
        onClose={handleCloseChangePasswordDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h6" fontWeight={700} color="#e48a3a">
            Change Password
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Update your encryption password
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pb: 2 }}>
          {passwordChangeError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordChangeError}
            </Alert>
          )}

          <TextField
            fullWidth
            type="password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
            required
            disabled={passwordChangeLoading}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            required
            disabled={passwordChangeLoading}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            margin="normal"
            required
            disabled={passwordChangeLoading}
            sx={{ mb: 2 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Your new password will be used to generate a new personal encryption key. 
            This will re-encrypt your data with the new key.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleCloseChangePasswordDialog} 
            disabled={passwordChangeLoading}
            sx={{ color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleChangePassword}
            variant="contained"
            disabled={passwordChangeLoading || !currentPassword || !newPassword || !confirmNewPassword}
            sx={{ 
              bgcolor: '#e48a3a',
              '&:hover': { bgcolor: '#d17a2a' }
            }}
          >
            {passwordChangeLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Change Password'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}