import fs from 'fs';
import path from 'path';

const MEDIA_DIR = path.resolve(process.cwd(), 'media');

function scanStoriesFromFileSystem() {
  const stories = [];
  
  if (!fs.existsSync(MEDIA_DIR)) {
    return stories;
  }

  // Scan all user directories
  const userDirs = fs.readdirSync(MEDIA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const userDir of userDirs) {
    const userStoriesDir = path.join(MEDIA_DIR, userDir, 'stories');
    
    if (!fs.existsSync(userStoriesDir)) {
      continue;
    }

    // Get all story files for this user
    const storyFiles = fs.readdirSync(userStoriesDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name);

    for (const storyFile of storyFiles) {
      const storyPath = path.join(userStoriesDir, storyFile);
      const stats = fs.statSync(storyPath);
      
      // Determine file type
      const ext = path.extname(storyFile).toLowerCase();
      const type = ext === '.mp4' ? 'video' : 'image';
      
      // Create story object
      const story = {
        id: `${userDir}-${storyFile}`,
        address: userDir,
        mediaUrl: `/api/media/${userDir}/stories/${storyFile}`,
        type,
        timestamp: stats.mtime.getTime(),
        filename: storyFile
      };
      
      stories.push(story);
    }
  }

  // Sort by timestamp (newest first)
  return stories.sort((a, b) => b.timestamp - a.timestamp);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const stories = scanStoriesFromFileSystem();
      
      // Optionally filter by ?since=timestamp
      const since = req.query.since ? Number(req.query.since) : null;
      if (since) {
        const filteredStories = stories.filter(story => story.timestamp > since);
        res.status(200).json(filteredStories);
      } else {
        res.status(200).json(stories);
      }
    } catch (error) {
      console.error('Error scanning stories:', error);
      res.status(500).json({ error: 'Failed to load stories' });
    }
  } else if (req.method === 'POST') {
    // For backward compatibility, we'll still accept POST requests
    // but we don't need to store anything since stories are now file-based
    const { address, mediaUrl, type, timestamp } = req.body;
    if (!address || !mediaUrl || !type || !timestamp) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    
    // Return success but don't store in JSON file
    res.status(201).json({ 
      success: true, 
      message: 'Story uploaded successfully (file-based storage)' 
    });
  } else {
    res.status(405).end();
  }
} 