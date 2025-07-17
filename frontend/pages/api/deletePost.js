import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, contentHash } = req.body;
  if (!address || !contentHash) {
    return res.status(400).json({ error: 'Missing address or contentHash' });
  }

  // Path to the post file (image/video)
  const postPath = path.join(process.cwd(), 'media', address, 'posts', contentHash);
  const commentsDir = path.join(process.cwd(), 'media', address, 'posts', contentHash, 'comments');
  const likesFile = path.join(process.cwd(), 'media', address, 'posts', contentHash, 'likes.json');

  try {
    if (fs.existsSync(postPath)) {
      fs.unlinkSync(postPath);
      // Delete comments folder
      if (fs.existsSync(commentsDir)) {
        fs.rmSync(commentsDir, { recursive: true, force: true });
      }
      // Delete likes file
      if (fs.existsSync(likesFile)) {
        fs.unlinkSync(likesFile);
      }
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ error: 'File not found' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete file', details: err.message });
  }
} 