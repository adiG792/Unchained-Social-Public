// utils/getUserStats.js
// Placeholder for fetching user stats

import { ethers } from 'ethers';
import PostContractAbi from '../abis/PostContract.json';

const contractAddress = require('../src/contracts.json').PostContract;

export default async function getUserStats(address) {
  if (!address || !window.ethereum) return {
    posts: 0,
    followers: 0,
    following: 0,
    joined: 'nil',
    tips: 0,
  };
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(contractAddress, PostContractAbi.abi, provider);

  // Posts count
  let posts = 0;
  let firstPostTimestamp = null;
  const postCount = Number(await contract.postCount());
  for (let i = 1; i <= postCount; i++) {
    const post = await contract.posts(i);
    if (post.author.toLowerCase() === address.toLowerCase()) {
      posts++;
      if (!firstPostTimestamp || post.timestamp < firstPostTimestamp) {
        firstPostTimestamp = post.timestamp;
      }
    }
  }

  // UsernameSet event (for join date if no post)
  let firstUsernameSet = null;
  try {
    const events = await contract.queryFilter(contract.filters.UsernameSet(address), 0, 'latest');
    if (events.length > 0) {
      const ts = events[0].blockNumber
        ? (await provider.getBlock(events[0].blockNumber)).timestamp
        : null;
      if (ts && (!firstPostTimestamp || ts < firstPostTimestamp)) {
        firstUsernameSet = ts;
      }
    }
  } catch {}

  // Followers/following counts
  let followers = 0;
  let following = 0;
  try {
    // Follower count: scan UserFollowed events where followed == address
    const followedEvents = await contract.queryFilter(contract.filters.UserFollowed(null, address), 0, 'latest');
    followers = followedEvents.length;
    // Following count: getFollowing
    const followingList = await contract.getFollowing(address);
    following = followingList.length;
  } catch {}

  // Joined date
  let joinedTs = firstPostTimestamp || firstUsernameSet;
  let joined = 'nil';
  if (joinedTs) {
    const date = new Date(Number(joinedTs) * 1000);
    joined = date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }

  return {
    posts,
    followers,
    following,
    joined,
    tips: 0, // Not implemented here
  };
}

/**
 * Gets the avatar URL for a user with proper fallback handling
 * @param {string} address - The wallet address
 * @returns {string} - The avatar URL with cache busting
 */
export function getAvatarUrl(address) {
  if (!address) return '';
  
  if (typeof window !== 'undefined') {
    // First try localStorage (like other components)
    const stored = localStorage.getItem(`avatar_${address.toLowerCase()}`);
    if (stored) {
      return `${stored}?t=${Date.now()}`;
    }
  }
  
  // Fallback to hardcoded path
  return `/api/media/${address.toLowerCase()}/profile/avatar.jpg?t=${Date.now()}`;
}

/**
 * Gets avatar props for Material-UI Avatar component with proper error handling
 * @param {string} address - The wallet address
 * @param {string} username - The username for fallback initial
 * @param {object} sx - Additional sx props
 * @returns {object} - Avatar props object
 */
export function getAvatarProps(address, username = '', sx = {}) {
  const displayName = username || address || '';
  const initial = displayName.charAt(0).toUpperCase();
  
  return {
    src: getAvatarUrl(address),
    sx: {
      bgcolor: '#6366f1',
      color: 'white',
      fontSize: '14px',
      fontWeight: 'bold',
      ...sx
    },
    children: initial,
    onError: (e) => {
      e.target.style.display = 'none';
      e.target.nextSibling.style.display = 'flex';
    }
  };
}

/**
 * Creates a complete avatar component with fallback
 * @param {string} address - The wallet address
 * @param {string} username - The username for fallback initial
 * @param {object} sx - Additional sx props
 * @returns {object} - Object with primary and fallback avatar props
 */
export function createAvatarWithFallback(address, username = '', sx = {}) {
  const displayName = username || address || '';
  const initial = displayName.charAt(0).toUpperCase();
  
  return {
    primary: {
      src: getAvatarUrl(address),
      sx: { ...sx },
      onError: (e) => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }
    },
    fallback: {
      sx: {
        bgcolor: '#6366f1',
        color: 'white',
        fontSize: sx.fontSize || '14px',
        fontWeight: 'bold',
        display: 'none',
        ...sx
      },
      children: initial
    }
  };
}

/**
 * Validates and fixes avatar URL format
 * @param {string} url - The avatar URL to validate
 * @param {string} address - The wallet address
 * @returns {string} - The corrected avatar URL or empty string if invalid
 */
export function validateAvatarUrl(url, address) {
  if (!url || !address) return '';
  
  // If URL doesn't contain /api/media/, it's invalid
  if (!url.includes('/api/media/')) return '';
  
  // If URL doesn't contain /profile/, fix it
  if (!url.includes('/profile/')) {
    const urlParts = url.split('/api/media/');
    if (urlParts.length > 1) {
      const pathParts = urlParts[1].split('/');
      if (pathParts.length >= 2) {
        const filename = pathParts[pathParts.length - 1].split('?')[0]; // Remove query params
        return `/api/media/${address.toLowerCase()}/profile/${filename}`;
      }
    }
    return '';
  }
  
  // Ensure address is lowercase in the URL
  const normalizedAddress = address.toLowerCase();
  if (url.includes(`/api/media/${address}`) && address !== normalizedAddress) {
    return url.replace(`/api/media/${address}`, `/api/media/${normalizedAddress}`);
  }
  
  return url;
} 