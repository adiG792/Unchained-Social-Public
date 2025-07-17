import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Avatar, Box } from '@mui/material';
import { toast } from 'react-toastify';
import { getAvatarUrl as getAvatarUrlUtil } from '../utils/getUserStats';

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [userDirectory, setUserDirectory] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [currentAccount, setCurrentAccount] = useState('');
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    loadUsers();
    getCurrentAccount();
    loadRecentSearches();
  }, []);

  const loadRecentSearches = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (e) {
          console.error('Error parsing recent searches:', e);
          setRecentSearches([]);
        }
      }
    }
  };

  const saveRecentSearch = (user) => {
    if (typeof window !== 'undefined') {
      const newRecent = [
        user,
        ...recentSearches.filter(u => u.address !== user.address)
      ].slice(0, 5); // Keep only 5 most recent
      setRecentSearches(newRecent);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    }
  };

  const removeRecentSearch = (address) => {
    const newRecent = recentSearches.filter(u => u.address !== address);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        setUserDirectory(users);
      } else {
        setError('Failed to load users');
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentAccount = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0].toLowerCase());
        }
      } catch (error) {
        console.error('Error getting current account:', error);
      }
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setFocused(false);
        setShowSuggestions(false);
      }
    }
    if (dropdownOpen || showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, showSuggestions]);

  const handleInput = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length > 0) {
      setShowSuggestions(true);
      
      const results = userDirectory.filter(user => {
        const username = user.username?.toLowerCase() || '';
        const address = user.address?.toLowerCase() || '';
        const queryLower = value.toLowerCase();
        
        const usernameMatch = username.includes(queryLower);
        const addressMatch = address.includes(queryLower);
        
        if (usernameMatch && addressMatch) {
          return { ...user, matchType: 'both', matchQuery: value };
        } else if (usernameMatch) {
          return { ...user, matchType: 'username', matchQuery: value };
        } else if (addressMatch) {
          return { ...user, matchType: 'address', matchQuery: value };
        }
        return false;
      }).map(user => {
        const username = user.username?.toLowerCase() || '';
        const address = user.address?.toLowerCase() || '';
        const queryLower = value.toLowerCase();
        
        const usernameMatch = username.includes(queryLower);
        const addressMatch = address.includes(queryLower);
        
        if (usernameMatch && addressMatch) {
          return { ...user, matchType: 'both', matchQuery: value };
        } else if (usernameMatch) {
          return { ...user, matchType: 'username', matchQuery: value };
        } else if (addressMatch) {
          return { ...user, matchType: 'address', matchQuery: value };
        }
        return user;
      });
      
      setFiltered(results);
      setDropdownOpen(true);
      setShowSuggestions(false);
    } else {
      setFiltered([]);
      setDropdownOpen(false);
      setShowSuggestions(true);
    }
  };

  const handleSelect = (address) => {
    const selectedUser = userDirectory.find(u => u.address === address) || 
                        recentSearches.find(u => u.address === address);
    if (selectedUser) {
      saveRecentSearch(selectedUser);
    }
    router.push(`/profile/${address}`);
    setQuery('');
    setFiltered([]);
    setDropdownOpen(false);
    setShowSuggestions(false);
    setFocused(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filtered.length > 0) {
      handleSelect(filtered[0].address);
    } else if (e.key === 'Escape') {
      setQuery('');
      setFiltered([]);
      setDropdownOpen(false);
      setShowSuggestions(false);
      setFocused(false);
    }
  };

  const getTrendingUsers = () => {
    return userDirectory
      .filter(user => user.address.toLowerCase() !== currentAccount)
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5);
  };

  const expanded = hovered || focused || query.length > 0;
  const shouldShowDropdown = dropdownOpen || showSuggestions;

  useEffect(() => {
    if (focused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focused]);

  const getAvatarUrl = (address) => {
    return getAvatarUrlUtil(address);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center transition-all duration-300 ${expanded ? 'w-80' : 'w-12'} h-12 max-w-sm w-full mb-6`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      tabIndex={0}
      style={{ justifyContent: 'flex-start' }}
      role="search"
      aria-label="Search users"
    >
      <button
        className="absolute left-0 top-0 w-12 h-12 flex items-center justify-center text-[#e48a3a] focus:outline-none z-10"
        tabIndex={-1}
        style={{ pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {loading ? (
          <CircularProgress size={20} color="warning" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        )}
      </button>
      
      <input
        ref={inputRef}
        type="text"
        placeholder="Search by username or wallet address..."
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => { 
          setFocused(true); 
          if (query.length > 0) {
            setDropdownOpen(true);
          } else {
            setShowSuggestions(true);
          }
        }}
        onMouseEnter={() => {
          if (query.length > 0) {
            setDropdownOpen(true);
          } else {
            setShowSuggestions(true);
          }
        }}
        onBlur={() => setFocused(false)}
        className={`transition-all duration-300 pl-12 pr-4 py-2 rounded-full border border-[#f5e7d6] bg-white shadow text-sm font-medium focus:outline-none h-12 ${expanded ? 'w-64 opacity-100' : 'w-0 opacity-0'}`}
        style={{ lineHeight: '2.5rem', minWidth: expanded ? '16rem' : 0, pointerEvents: expanded ? 'auto' : 'none', borderRadius: 32 }}
        disabled={loading}
        aria-expanded={shouldShowDropdown}
        aria-haspopup="listbox"
        aria-controls="search-results"
      />
      
      {/* Dropdown */}
      <div
        id="search-results"
        role="listbox"
        className={`absolute left-0 top-14 w-full z-20 transition-all duration-300 ${shouldShowDropdown ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
        style={{ minWidth: '16rem', borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 32px 0 rgba(31,38,135,0.10)' }}
        aria-hidden={!shouldShowDropdown}
      >
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto" style={{ borderRadius: 24 }}>
          {/* Search Results */}
          {filtered.length > 0 && query.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                Search Results
              </div>
              {filtered.map((user, index) => {
                const highlightText = (text, query) => {
                  if (!text || !query) return text;
                  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                  const parts = text.split(regex);
                  return parts.map((part, i) => 
                    regex.test(part) ? (
                      <span key={i} className="bg-yellow-200 font-semibold">{part}</span>
                    ) : part
                  );
                };

                return (
                  <div
                    key={user.address}
                    role="option"
                    aria-selected="false"
                    className="flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSelect(user.address)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(user.address);
                      }
                    }}
                    tabIndex={0}
                  >
                    <Box position="relative">
                      <Avatar 
                        src={getAvatarUrl(user.address)}
                        sx={{ width: 32, height: 32, mr: 2 }}
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
                          mr: 2, 
                          display: 'none',
                          bgcolor: '#6366f1',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          position: 'absolute',
                          top: 0,
                          left: 0
                        }}
                      >
                        {user.username.charAt(0).toUpperCase()}
                      </Avatar>
                    </Box>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {highlightText(user.username, user.matchQuery)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {highlightText(user.address, user.matchQuery)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-xs text-gray-400">
                          {user.postCount} post{user.postCount !== 1 ? 's' : ''}
                        </div>
                        {user.matchType === 'both' && (
                          <div className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Both
                          </div>
                        )}
                        {user.matchType === 'username' && (
                          <div className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Username
                          </div>
                        )}
                        {user.matchType === 'address' && (
                          <div className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            Address
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Recent Searches */}
          {showSuggestions && recentSearches.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                Recent Searches
              </div>
              {recentSearches.map((user) => (
                <div
                  key={user.address}
                  role="option"
                  aria-selected="false"
                  className="flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSelect(user.address)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(user.address);
                    }
                  }}
                  tabIndex={0}
                >
                  <Box position="relative">
                    <Avatar 
                      src={getAvatarUrl(user.address)}
                      sx={{ width: 32, height: 32, mr: 2 }}
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
                        mr: 2, 
                        display: 'none',
                        bgcolor: '#6366f1',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </Box>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {user.username}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(user.address);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    aria-label="Remove from recent searches"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Trending Users */}
          {showSuggestions && getTrendingUsers().length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                Trending
              </div>
              {getTrendingUsers().map((user) => (
                <div
                  key={user.address}
                  role="option"
                  aria-selected="false"
                  className="flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSelect(user.address)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(user.address);
                    }
                  }}
                  tabIndex={0}
                >
                  <Box position="relative">
                    <Avatar 
                      src={getAvatarUrl(user.address)}
                      sx={{ width: 32, height: 32, mr: 2 }}
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
                        mr: 2, 
                        display: 'none',
                        bgcolor: '#6366f1',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </Box>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {user.username}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {user.postCount} post{user.postCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-xs text-orange-500 font-medium">
                    🔥
                  </div>
                </div>
              ))}
            </>
          )}
          
          {filtered.length === 0 && query.length > 0 && (
            <div className="p-3 text-center text-gray-500 text-sm">
              No users found for "{query}"
            </div>
          )}

          {showSuggestions && recentSearches.length === 0 && getTrendingUsers().length === 0 && (
            <div className="p-3 text-center text-gray-500 text-sm">
              Start typing to search users
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
