import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Server-side encryption key (different from user's personal key)
const SERVER_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY?.slice(0, 32);

if (!SERVER_ENCRYPTION_KEY || SERVER_ENCRYPTION_KEY.length !== 32) {
  throw new Error('SERVER_ENCRYPTION_KEY must be exactly 32 characters for AES-256');
}

function decryptPassword(encrypted) {
  const iv = Buffer.from(encrypted.iv, 'hex');
  const encryptedBuffer = Buffer.from(encrypted.data, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SERVER_ENCRYPTION_KEY), iv);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]).toString('utf8');
}

function generatePersonalKey(password, address) {
  // Generate a personal encryption key based on password and address
  const salt = address.toLowerCase();
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return key.toString('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, password } = req.body;

  if (!address || !password) {
    return res.status(400).json({ error: 'Address and password are required' });
  }

  try {
    const passwordFile = path.join(process.cwd(), 'media', address.toLowerCase(), 'profile', 'password.json');
    
    if (!fs.existsSync(passwordFile)) {
      return res.status(404).json({ error: 'No password set for this address' });
    }

    const encryptedPassword = JSON.parse(fs.readFileSync(passwordFile, 'utf8'));
    const storedPassword = decryptPassword(encryptedPassword);

    if (password !== storedPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate personal encryption key
    const personalKey = generatePersonalKey(password, address);

    res.status(200).json({ 
      success: true, 
      personalKey,
      message: 'Password verified successfully' 
    });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
} 