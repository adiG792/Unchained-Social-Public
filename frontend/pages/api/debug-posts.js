import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mediaDir = path.join(process.cwd(), 'media');
    const posts = [];

    if (fs.existsSync(mediaDir)) {
      const userDirs = fs.readdirSync(mediaDir);
      
      for (const userDir of userDirs) {
        const userPath = path.join(mediaDir, userDir);
        const postsDir = path.join(userPath, 'posts');
        
        if (fs.existsSync(postsDir)) {
          const postFiles = fs.readdirSync(postsDir);
          posts.push({
            user: userDir,
            posts: postFiles
          });
        }
      }
    }

    res.status(200).json({
      totalUsers: posts.length,
      posts: posts
    });
  } catch (error) {
    console.error('Debug posts error:', error);
    res.status(500).json({ error: 'Failed to get posts', details: error.message });
  }
} 