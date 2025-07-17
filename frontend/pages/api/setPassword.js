import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Server-side encryption key (different from user's personal key)
const SERVER_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY?.slice(0, 32);

if (!SERVER_ENCRYPTION_KEY || SERVER_ENCRYPTION_KEY.length !== 32) {
  throw new Error('SERVER_ENCRYPTION_KEY must be exactly 32 characters for AES-256');
}

function encryptPassword(password) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SERVER_ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return { iv: iv.toString('hex'), data: encrypted.toString('hex') };
}

function decryptPassword(encrypted) {
  const iv = Buffer.from(encrypted.iv, 'hex');
  const encryptedBuffer = Buffer.from(encrypted.data, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SERVER_ENCRYPTION_KEY), iv);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { address, password } = req.body;

    if (!address || !password) {
      return res.status(400).json({ error: 'Address and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
      const profileDir = path.join(process.cwd(), 'media', address.toLowerCase(), 'profile');
      
      // Create profile directory if it doesn't exist
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }

      // Encrypt and save password
      const encryptedPassword = encryptPassword(password);
      const passwordFile = path.join(profileDir, 'password.json');
      fs.writeFileSync(passwordFile, JSON.stringify(encryptedPassword), 'utf8');

      res.status(200).json({ success: true, message: 'Password set successfully' });
    } catch (error) {
      console.error('Error setting password:', error);
      res.status(500).json({ error: 'Failed to set password' });
    }
  } else if (req.method === 'GET') {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    try {
      const passwordFile = path.join(process.cwd(), 'media', address.toLowerCase(), 'profile', 'password.json');
      
      if (!fs.existsSync(passwordFile)) {
        return res.status(404).json({ error: 'No password set for this address' });
      }

      const encryptedPassword = JSON.parse(fs.readFileSync(passwordFile, 'utf8'));
      const password = decryptPassword(encryptedPassword);

      res.status(200).json({ hasPassword: true });
    } catch (error) {
      console.error('Error checking password:', error);
      res.status(500).json({ error: 'Failed to check password' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 