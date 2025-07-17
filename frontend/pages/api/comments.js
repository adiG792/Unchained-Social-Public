import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Take exactly 32 characters from the ENCRYPTION_KEY
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY?.slice(0, 32);

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  console.error('ENCRYPTION_KEY error:', {
    ENCRYPTION_KEY,
    length: ENCRYPTION_KEY ? ENCRYPTION_KEY.length : 0
  });
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters for AES-256');
}

function encryptBuffer(buffer) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return { iv: iv.toString('hex'), data: encrypted.toString('hex') };
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

function decryptBuffer(encrypted) {
  try {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const encryptedBuffer = Buffer.from(encrypted.data, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}

const baseMediaDir = path.join(process.cwd(), 'media');

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // { address, postId, author, text, timestamp, personalKey }
      const { address, postId, author, text, timestamp, personalKey } = req.body;
      
      if (!address || !postId || !author || !text || !timestamp) {
        return res.status(400).json({ error: 'Missing fields' });
      }
      
      // Use the postId directly (it should now be the numeric post ID)
      const actualPostId = postId;
      
      const commentsDir = path.join(baseMediaDir, address, 'posts', actualPostId, 'comments');
      
      try {
        if (!fs.existsSync(commentsDir)) {
          try {
            fs.mkdirSync(commentsDir, { recursive: true });
          } catch (mkdirErr) {
            console.error('Failed to create commentsDir:', commentsDir, mkdirErr, { body: req.body });
            return res.status(500).json({ error: 'Failed to create comments directory', details: mkdirErr.message });
          }
        }
        const commentId = Date.now().toString() + Math.random().toString(36).slice(2);
        const commentData = { author, text, timestamp };
        let encrypted;
        if (personalKey) {
          if (typeof personalKey !== 'string' || personalKey.length !== 64) {
            console.error('Invalid personalKey received:', { personalKey, length: personalKey.length, body: req.body });
            return res.status(400).json({ error: 'personalKey must be a 64-character hex string (32 bytes)' });
          }
          try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(personalKey, 'hex'), iv);
            const encryptedData = Buffer.concat([cipher.update(JSON.stringify(commentData), 'utf8'), cipher.final()]);
            encrypted = { iv: iv.toString('hex'), data: encryptedData.toString('hex'), personal: true };
          } catch (encErr) {
            console.error('Personal key encryption error:', encErr, { personalKey, body: req.body });
            return res.status(500).json({ error: 'Failed to encrypt comment with personalKey', details: encErr.message });
          }
        } else {
          try {
            encrypted = encryptBuffer(Buffer.from(JSON.stringify(commentData)));
          } catch (encErr) {
            console.error('Server key encryption error:', encErr, { body: req.body });
            return res.status(500).json({ error: 'Failed to encrypt comment with server key', details: encErr.message });
          }
        }
        const commentFile = path.join(commentsDir, `${commentId}.json`);
        try {
          fs.writeFileSync(commentFile, JSON.stringify(encrypted), 'utf8');
        } catch (writeErr) {
          console.error('Failed to write comment file:', commentFile, writeErr, { body: req.body });
          return res.status(500).json({ error: 'Failed to write comment file', details: writeErr.message });
        }
        res.status(201).json({ success: true, commentId });
      } catch (encryptionError) {
        console.error('Encryption/File write error (outer catch):', encryptionError, { body: req.body });
        res.status(500).json({ error: 'Failed to encrypt or save comment (outer catch)', details: encryptionError.message });
      }
    } else if (req.method === 'GET') {
      // /api/comments?address=...&postId=...&personalKey=...
      const { address, postId, personalKey } = req.query;
      
      if (!address || !postId) {
        return res.status(400).json({ error: 'Missing address or postId' });
      }
      
      // Use the postId directly (it should now be the numeric post ID)
      const actualPostId = postId;
      
      const commentsDir = path.join(baseMediaDir, address, 'posts', actualPostId, 'comments');
      
      if (!fs.existsSync(commentsDir)) {
        return res.status(200).json([]);
      }
      
      try {
        const files = fs.readdirSync(commentsDir).filter(f => f.endsWith('.json'));
        
        const comments = files.map(f => {
          try {
            const encrypted = JSON.parse(fs.readFileSync(path.join(commentsDir, f), 'utf8'));
            let decrypted;
            
            if (encrypted.personal && personalKey) {
              // Use personal key decryption
              const iv = Buffer.from(encrypted.iv, 'hex');
              const encryptedBuffer = Buffer.from(encrypted.data, 'hex');
              const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(personalKey, 'hex'), iv);
              const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
              decrypted = JSON.parse(decryptedBuffer.toString('utf8'));
            } else {
              // Use server key decryption (fallback)
              const buf = decryptBuffer(encrypted);
              decrypted = JSON.parse(buf.toString());
            }
            
            return decrypted;
          } catch (error) {
            console.error('Error processing comment file:', f, error);
            return null;
          }
        }).filter(Boolean);
        
        res.status(200).json(comments);
      } catch (readError) {
        console.error('Error reading comments:', readError);
        res.status(500).json({ error: 'Failed to read comments', details: readError.message });
      }
    } else {
      res.status(405).end();
    }
  } catch (error) {
    console.error('Comments API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      type: error.constructor.name
    });
  }
} 