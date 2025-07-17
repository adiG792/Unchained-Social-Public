import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';

export default function LoginModal({ open, onClose, address, onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && address) {
      checkIfUserExists();
    }
  }, [open, address]);

  const checkIfUserExists = async () => {
    try {
      const response = await fetch(`/api/setPassword?address=${address.toLowerCase()}`);
      if (response.status === 404) {
        setIsNewUser(true);
      } else {
        setIsNewUser(false);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setIsNewUser(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isNewUser) {
        // New user - set password
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/setPassword', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: address.toLowerCase(),
            password: password
          })
        });

        if (response.ok) {
          // Verify password to get personal key
          const verifyResponse = await fetch('/api/verifyPassword', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address: address.toLowerCase(),
              password: password
            })
          });

          if (verifyResponse.ok) {
            const { personalKey } = await verifyResponse.json();
            
            // Store personal key securely (in memory only)
            sessionStorage.setItem(`personalKey_${address.toLowerCase()}`, personalKey);
            
            toast.success('Account created successfully!');
            onLoginSuccess(personalKey);
            onClose();
          } else {
            setError('Failed to create account');
          }
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to create account');
        }
      } else {
        // Existing user - verify password
        const response = await fetch('/api/verifyPassword', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: address.toLowerCase(),
            password: password
          })
        });

        if (response.ok) {
          const { personalKey } = await response.json();
          
          // Store personal key securely (in memory only)
          sessionStorage.setItem(`personalKey_${address.toLowerCase()}`, personalKey);
          
          toast.success('Login successful!');
          onLoginSuccess(personalKey);
          onClose();
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Invalid password');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setLoading(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
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
          {isNewUser ? 'Create Account' : 'Login'}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pb: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading}
            sx={{ mb: 2 }}
          />

          {isNewUser && (
            <TextField
              fullWidth
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              sx={{ mb: 2 }}
            />
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {isNewUser 
              ? 'Create a password to encrypt your personal data. This password is separate from your MetaMask wallet.'
              : 'Enter your password to access your encrypted data.'
            }
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            sx={{ color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="contained"
            disabled={loading || !password || (isNewUser && password !== confirmPassword)}
            sx={{ 
              bgcolor: '#e48a3a',
              '&:hover': { bgcolor: '#d17a2a' }
            }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              isNewUser ? 'Create Account' : 'Login'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 