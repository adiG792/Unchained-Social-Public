import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to get users from the username indexer first
    try {
      const indexerResponse = await fetch('http://localhost:3001/users');
      if (indexerResponse.ok) {
        const indexedUsers = await indexerResponse.json();
    
        
        // Convert to the format expected by the search component
        const users = indexedUsers.map(user => ({
          address: user.address,
          username: user.username,
          postCount: 0 // We'll add post count from file system
        }));
        
        // Add post counts from file system
        const mediaDir = path.join(process.cwd(), 'media');
        if (fs.existsSync(mediaDir)) {
          for (const user of users) {
            const userPath = path.join(mediaDir, user.address.toLowerCase());
            const postsDir = path.join(userPath, 'posts');
            if (fs.existsSync(postsDir)) {
              const posts = fs.readdirSync(postsDir);
              user.postCount = posts.length;
            }
          }
        }
        

        return res.status(200).json(users);
      }
    } catch (indexerError) {

    }

    // Fallback to file-based approach if indexer is not available
    const mediaDir = path.join(process.cwd(), 'media');
    const users = [];

    if (!fs.existsSync(mediaDir)) {
  
      return res.status(200).json(users);
    }

    const userDirs = fs.readdirSync(mediaDir);

    
    for (const userDir of userDirs) {
      try {
        const userPath = path.join(mediaDir, userDir);
        if (!fs.statSync(userPath).isDirectory()) continue;

        const postsDir = path.join(userPath, 'posts');
        if (fs.existsSync(postsDir)) {
          const posts = fs.readdirSync(postsDir);
          if (posts.length > 0) {
            let username = null;
            const profileDir = path.join(userPath, 'profile');
            if (fs.existsSync(profileDir)) {
              const profileFiles = fs.readdirSync(profileDir);
              const usernameFile = profileFiles.find(f => f === 'username.txt');
              if (usernameFile) {
                try {
                  username = fs.readFileSync(path.join(profileDir, usernameFile), 'utf8').trim();
                } catch (e) {
                  console.error('Error reading username for', userDir, e);
                }
              }
            }

            const userData = {
              address: userDir,
              username: username || `User ${userDir.slice(0, 6)}...${userDir.slice(-4)}`,
              postCount: posts.length
            };
            users.push(userData);
    
          }
        }
      } catch (error) {
        console.error('Error processing user directory:', userDir, error);
      }
    }


    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
} 