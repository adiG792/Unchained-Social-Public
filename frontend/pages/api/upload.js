import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

// 🔐 Load encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY?.slice(0, 32);
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters for AES-256');
}

// ✅ Base media directory (now under /media instead of /public/media)
const baseMediaDir = path.join(process.cwd(), 'media');

// 🔐 Encrypt buffer with AES-256-CBC
function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(16); // Generate random IV for each file
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  
  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);
  
  return {
    iv: iv.toString('hex'),
    data: encrypted.toString('hex')
  };
}

// ✅ Create user directory if it doesn't exist
function ensureUserDir(walletAddress, type) {
  let userDir = path.join(baseMediaDir, walletAddress);
  if (type === 'profile') {
    userDir = path.join(userDir, 'profile');
  } else if (type === 'posts') {
    userDir = path.join(userDir, 'posts');
  } else if (type === 'stories') {
    userDir = path.join(userDir, 'stories');
  }
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
    
  }
  return userDir;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔍 Extract wallet address, type, and filename from query params
  const { wallet, type, filename } = req.query;
  
  if (!wallet || typeof wallet !== 'string' || wallet.length !== 42) {
    return res.status(400).json({ 
      error: 'Valid wallet address required (42 character hex string)' 
    });
  }

  // 🔧 Normalize wallet address to lowercase to prevent case-sensitivity issues
  const normalizedWallet = wallet.toLowerCase();

  // ✅ Ensure base media directory exists
  if (!fs.existsSync(baseMediaDir)) {
    fs.mkdirSync(baseMediaDir, { recursive: true });
  }

  // ✅ Create user-specific directory (profile or posts)
  const userDir = ensureUserDir(normalizedWallet, type);

  const form = formidable({
    uploadDir: userDir, // Upload to user-specific directory
    keepExtensions: true,
    multiples: false,
    filename: (name, ext, part, form) => {
      // Use provided filename if available, otherwise generate one
      if (filename) {
        return filename;
      }
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const extension = path.extname(part.originalFilename || '.dat');
      return `${timestamp}-${random}${extension}`;
    },
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('❌ Upload error:', err);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    const uploaded = files.file?.[0] || files.file;
    if (!uploaded || !uploaded.filepath) {
      return res.status(400).json({ error: 'No file received' });
    }

    // If a specific filename was provided, rename the file
    let finalFilePath = uploaded.filepath;
    if (filename) {
      const newFilePath = path.join(userDir, filename);
      fs.renameSync(uploaded.filepath, newFilePath);
      finalFilePath = newFilePath;
    }

    try {
      // 📖 Read the uploaded file
      const originalBuffer = fs.readFileSync(finalFilePath);
      
      // 🔐 Encrypt the file content
      const encrypted = encryptBuffer(originalBuffer);
      
      // 💾 Create encrypted file data structure
      const encryptedFileData = JSON.stringify({
        iv: encrypted.iv,
        data: encrypted.data,
        originalName: path.basename(uploaded.filepath),
        uploadTime: new Date().toISOString(),
        wallet: normalizedWallet
      });

      // ✅ Write encrypted data to file
      fs.writeFileSync(finalFilePath, encryptedFileData, 'utf8');
      
      // 🗑️ Clean up: remove original unencrypted file if it exists
      // (formidable already handles this, but being explicit)
      
      const filename = path.basename(finalFilePath);

      
      // 🔄 Return wallet and filename for frontend reference
      let returnedPath = '';
      if (type === 'profile') {
        returnedPath = `${normalizedWallet}/profile/${filename}`;
      } else if (type === 'posts') {
        returnedPath = `${normalizedWallet}/posts/${filename}`;
      } else if (type === 'stories') {
        returnedPath = `${normalizedWallet}/stories/${filename}`;
      }
      res.status(200).json({ 
        success: true, 
        filename,
        wallet: normalizedWallet,
        path: returnedPath
      });

    } catch (encryptionError) {
      console.error('❌ Encryption error:', encryptionError);
      
      // 🗑️ Clean up failed upload
      if (fs.existsSync(uploaded.filepath)) {
        fs.unlinkSync(uploaded.filepath);
      }
      
      return res.status(500).json({ error: 'Failed to encrypt file' });
    }
  });
}