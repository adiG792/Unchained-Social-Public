import { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import PostContractAbi from '../abis/PostContract.json';
import Image from 'next/image';
import {
  Box,
  Typography,
  Button,
  TextField,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';

export default function PostForm({ contractAddress, setReloadTrigger, abi, personalKey }) {
  const [contentHash, setContentHash] = useState('');
  const [status, setStatus] = useState('');
  const [postId, setPostId] = useState('');
  const [postData, setPostData] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'read'

  // Username logic
  async function setUsernameFrontend() {
    const name = prompt("Enter your username:");
    if (!name) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi || PostContractAbi.abi, signer);
      const tx = await contract.setUsername(name);
      await tx.wait();
      toast.success("Username saved!");
    } catch (err) {
      toast.error("Failed to set username");
      console.error(err);
    }
  }

  async function submitPost() {
    if (!mediaFile) return alert('Please select a file first.');

    try {
      if (!window.ethereum) throw new Error('MetaMask not found');

      setStatus('Requesting MetaMask account access...');
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Generate a unique filename for the contentHash
      const extension = mediaFile.name ? mediaFile.name.substring(mediaFile.name.lastIndexOf('.')) : '';
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const uniqueFilename = `${timestamp}-${random}${extension}`;

      setStatus('Sending transaction — please confirm MetaMask popup');
      const contractWithSigner = new ethers.Contract(contractAddress, PostContractAbi.abi, signer);
      const tx = await contractWithSigner.createPost(uniqueFilename);

      setStatus('Waiting for blockchain confirmation...');
      const receipt = await tx.wait();

      const logs = receipt?.logs ?? [];
      const event = logs
        .map(log => {
          try {
            return contractWithSigner.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e?.name === 'NewPost');

      const newPostId = event?.args?.id?.toString();
      if (!newPostId) {
        setStatus('Post created, but no event found.');
        return;
      }

      setPostId(newPostId);
      setStatus('Uploading media...');

      // Now upload the file to the backend with the unique filename
      const formData = new FormData();
      formData.append('file', mediaFile, uniqueFilename);
      const res = await fetch(`/api/upload?wallet=${userAddress}&type=posts&filename=${uniqueFilename}`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      setContentHash(uniqueFilename);
      setMediaPreview(`/api/media/${userAddress}/posts/${uniqueFilename}`);
      setStatus(`Post created! Post ID: ${newPostId}`);

      toast.success(`Post created! Post ID: ${newPostId}`);

      if (typeof setReloadTrigger === 'function') {
        setReloadTrigger(prev => !prev);
      }

      // Clear form after successful post
      setMediaFile(null);
      setMediaPreview(null);
      setContentHash('');
    } catch (err) {
      if (err.code === 'ACTION_REJECTED' || err.code === 4001 || err.message?.includes('user rejected')) {
        setStatus('Transaction cancelled by user');
        toast.warning('Post creation cancelled by user');
      } else {
        console.error('Post submission error:', err);
        const errorMessage = err.message || 'Unknown error';
        setStatus('Error: ' + errorMessage);
        toast.error('Failed to create post');
      }
    }
  }

  async function readPost(id = postId) {

    if (!id) {
      toast.warning('Please enter post ID');
      return;
    }
    if (!window.ethereum) {
      toast.error('MetaMask not found');
      return;
    }

    try {
      setStatus('Fetching post...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, PostContractAbi.abi, provider);

      const count = await contract.getFunction('postCount')();
      const total = Number(count);
      const idNum = Number(id);

      if (idNum < 1 || idNum > total) {
        toast.error(`Post ID ${id} is invalid. Only ${total} posts exist.`);
        setStatus('Invalid post ID');
        return;
      }

      const post = await contract.getFunction('posts')(idNum);
      const hash = post.contentHash;

      // Skip non-media content like IPFS hashes
      const isValidMedia = /\.(png|jpe?g|gif|mp4)$/i.test(hash);
      if (!isValidMedia) {
        toast.warning('This post does not contain valid image or video content.');
        setStatus('Post is not a media file.');
        return;
      }

      setPostData({
        id: post.id.toString(),
        author: post.author,
        contentHash: hash,
        timestamp: new Date(Number(post.timestamp) * 1000).toLocaleString(),
      });

      setStatus('Post fetched!');
      toast.success('Post loaded successfully!');
    } catch (error) {
      console.error('❌ readPost error:', error);
      setStatus('Error fetching post.');
      toast.error('Failed to fetch post');
    }
  }

  function handleMediaChange(e) {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setStatus(''); // Clear any previous status

    }
  }

  return (
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
        Post Panel
      </Typography>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
            },
            '& .Mui-selected': {
              color: '#e48a3a',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#e48a3a',
            },
          }}
        >
          <Tab label="Create Post" value="create" />
          <Tab label="Read Post" value="read" />
        </Tabs>
      </Box>

      {/* Create Post Section */}
      {activeTab === 'create' && (
        <Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Your media will be posted to blockchain after upload
          </Typography>

          <Box sx={{ mb: 3 }}>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaChange}
              style={{ display: 'none' }}
              id="media-upload"
            />
            <label htmlFor="media-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<AddPhotoAlternateIcon />}
                sx={{ mb: 2 }}
                fullWidth
              >
                Choose Media File
              </Button>
            </label>
          </Box>

          {mediaPreview && (
            <Box sx={{ mb: 3 }}>
              {mediaFile?.type.startsWith('image') ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={mediaPreview} 
                    alt="preview" 
                    style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8 }} 
                  />
                  <IconButton
                    onClick={() => {
                      setMediaFile(null);
                      setMediaPreview(null);
                    }}
                    sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <video 
                    src={mediaPreview} 
                    controls 
                    style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8 }} 
                  />
                  <IconButton
                    onClick={() => {
                      setMediaFile(null);
                      setMediaPreview(null);
                    }}
                    sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Preview: {mediaFile?.name}
              </Typography>
            </Box>
          )}

          <Button
            onClick={submitPost}
            disabled={!mediaFile}
            variant="contained"
            fullWidth
            sx={{
              bgcolor: '#e48a3a',
              '&:hover': { bgcolor: '#d17a2a' },
              '&:disabled': { bgcolor: '#ccc' }
            }}
          >
            Submit Post
          </Button>
        </Box>
      )}

      {/* Read Post Section */}
      {activeTab === 'read' && (
        <Box>
          <Typography variant="h6" fontWeight={600} mb={3}>
            Read Post
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TextField
              type="number"
              placeholder="Post ID"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              sx={{ width: 120, mr: 2 }}
              size="small"
            />
            <Button
              onClick={() => readPost()}
              variant="contained"
              sx={{ bgcolor: '#666', '&:hover': { bgcolor: '#555' } }}
            >
              Read
            </Button>
          </Box>

          {postData && (
            <Paper sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="body2" mb={1}>
                <strong>ID:</strong> {postData.id}
              </Typography>
              <Typography variant="body2" mb={1}>
                <strong>Timestamp:</strong> {postData.timestamp}
              </Typography>
              <Typography variant="body2" mb={2}>
                <strong>Author:</strong> {postData.author}
              </Typography>

              {postData.contentHash.endsWith('.jpg') || postData.contentHash.endsWith('.png') ? (
                <img
                  src={`/api/media/${postData.contentHash}`}
                  alt="Post image"
                  style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8 }}
                />
              ) : postData.contentHash.endsWith('.mp4') ? (
                <video
                  src={`/api/media/${postData.contentHash}`}
                  controls
                  style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8 }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Unknown file type: {postData.contentHash}
                </Typography>
              )}
            </Paper>
          )}
        </Box>
      )}

      {status && (
        <Alert 
          severity={
            status.includes('Error') || status.includes('cancelled') 
              ? 'error' 
              : status.includes('created') || status.includes('fetched')
              ? 'success'
              : 'info'
          }
          sx={{ mt: 3 }}
        >
          {status}
        </Alert>
      )}
    </Paper>
  );
}