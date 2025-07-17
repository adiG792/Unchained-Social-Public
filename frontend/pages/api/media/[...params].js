import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY?.slice(0, 32);
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
}

export default function handler(req, res) {
  const params = req.query.params;

  if (!params || params.length < 2) {
    return res.status(400).send('Usage: /api/media/:wallet/.../:filename');
  }
  const wallet = params[0].toLowerCase(); // Normalize to lowercase
  const filePath = path.join(process.cwd(), 'media', wallet, ...params.slice(1));


  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  try {
    const encryptedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const iv = Buffer.from(encryptedData.iv, 'hex');
    const encryptedBuffer = Buffer.from(encryptedData.data, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);

    const ext = path.extname(params[params.length - 1]).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.send(decryptedBuffer);
  } catch (error) {
    console.error('❌ Error decrypting file:', error);
    res.status(500).send('Internal Server Error');
  }
}