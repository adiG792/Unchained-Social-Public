import fs from 'fs';
import path from 'path';

const MEDIA_DIR = path.resolve(process.cwd(), 'media');

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, filename } = req.body;

    if (!address || !filename) {
      return res.status(400).json({ error: 'Missing address or filename' });
    }

    // Construct the story file path
    const storyDir = path.join(MEDIA_DIR, address.toLowerCase(), 'stories');
    const storyPath = path.join(storyDir, filename);

    // Check if file exists
    if (!fs.existsSync(storyPath)) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Delete the encrypted story file
    fs.unlinkSync(storyPath);
    

    // Check if stories directory is empty and remove it if so
    if (fs.existsSync(storyDir)) {
      const remainingFiles = fs.readdirSync(storyDir);
      if (remainingFiles.length === 0) {
        fs.rmdirSync(storyDir);

      }
    }

    // Check if user directory is empty and remove it if so
    const userDir = path.join(MEDIA_DIR, address.toLowerCase());
    if (fs.existsSync(userDir)) {
      const userDirContents = fs.readdirSync(userDir);
      if (userDirContents.length === 0) {
        fs.rmdirSync(userDir);

      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Story deleted successfully from backend',
      deletedFile: filename,
      address: address.toLowerCase()
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story from backend' });
  }
} 