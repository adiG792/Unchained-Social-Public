import fs from 'fs';
import path from 'path';

function getLikesFile(address, postId) {
  return path.join(process.cwd(), 'media', address.toLowerCase(), 'posts', `${postId}.likes.json`);
}

function readLikes(address, postId) {
  const file = getLikesFile(address, postId);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function writeLikes(address, postId, likes) {
  const file = getLikesFile(address, postId);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(likes, null, 2));
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    const { address, postId, user } = req.query;
    if (!address || !postId) return res.status(400).json({ error: 'address and postId required' });
    const likes = readLikes(address, postId);
    const count = likes.length;
    const likedByUser = user ? likes.includes(user.toLowerCase()) : false;
    return res.status(200).json({ count, likedByUser });
  }
  if (req.method === 'POST') {
    const { address, postId, user, action } = req.body;
    if (!address || !postId || !user || !['like', 'unlike'].includes(action)) {
      return res.status(400).json({ error: 'address, postId, user, action required' });
    }
    let likes = readLikes(address, postId);
    const idx = likes.indexOf(user.toLowerCase());
    if (action === 'like' && idx === -1) {
      likes.push(user.toLowerCase());
    } else if (action === 'unlike' && idx !== -1) {
      likes.splice(idx, 1);
    }
    writeLikes(address, postId, likes);
    return res.status(200).json({ success: true });
  }
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 