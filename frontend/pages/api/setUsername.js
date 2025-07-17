import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, username } = req.body;

  if (!address || !username) {
    return res.status(400).json({ error: 'Address and username are required' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
  }

  // Basic validation for username format
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
  }

  try {
    const profileDir = path.join(process.cwd(), 'media', address.toLowerCase(), 'profile');
    
    // Create profile directory if it doesn't exist
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Check if username is already taken by another user
    const mediaDir = path.join(process.cwd(), 'media');
    if (fs.existsSync(mediaDir)) {
      const userDirs = fs.readdirSync(mediaDir);
      for (const userDir of userDirs) {
        if (userDir.toLowerCase() !== address.toLowerCase()) {
          const userProfileDir = path.join(mediaDir, userDir, 'profile');
          const usernameFile = path.join(userProfileDir, 'username.txt');
          if (fs.existsSync(usernameFile)) {
            const existingUsername = fs.readFileSync(usernameFile, 'utf8').trim();
            if (existingUsername.toLowerCase() === username.toLowerCase()) {
              return res.status(409).json({ error: 'Username already taken' });
            }
          }
        }
      }
    }

    // Save username to file (as backup/fallback)
    const usernameFile = path.join(profileDir, 'username.txt');
    fs.writeFileSync(usernameFile, username.trim(), 'utf8');

    // Note: The blockchain username should be set through the frontend
    // This API only handles file-based storage for now
    // Users should use the profile page which calls the blockchain setUsername

    res.status(200).json({ 
      success: true, 
      username: username.trim(),
      message: 'Username saved to file. Use profile page to set blockchain username.'
    });
  } catch (error) {
    console.error('Error setting username:', error);
    res.status(500).json({ error: 'Failed to set username' });
  }
} 