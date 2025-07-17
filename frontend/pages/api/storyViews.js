import fs from 'fs';
import path from 'path';

const VIEWS_FILE = path.join(process.cwd(), 'storyViews.json');

// Ensure the views file exists
function ensureViewsFile() {
  if (!fs.existsSync(VIEWS_FILE)) {
    fs.writeFileSync(VIEWS_FILE, JSON.stringify({}));
  }
}

// Load views data
function loadViews() {
  ensureViewsFile();
  try {
    const data = fs.readFileSync(VIEWS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// Save views data
function saveViews(views) {
  ensureViewsFile();
  fs.writeFileSync(VIEWS_FILE, JSON.stringify(views, null, 2));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get viewed stories for a specific account
    const { account } = req.query;
    
    if (!account) {
      return res.status(400).json({ error: 'Account parameter is required' });
    }

    const views = loadViews();
    const accountViews = views[account.toLowerCase()] || [];
    
    return res.status(200).json(accountViews);
  }

  if (req.method === 'POST') {
    // Mark a story as viewed
    const { account, storyId } = req.body;
    
    if (!account || !storyId) {
      return res.status(400).json({ error: 'Account and storyId are required' });
    }

    const views = loadViews();
    const accountKey = account.toLowerCase();
    
    if (!views[accountKey]) {
      views[accountKey] = [];
    }
    
    // Add story to viewed list if not already there
    if (!views[accountKey].includes(storyId)) {
      views[accountKey].push(storyId);
      saveViews(views);
    }
    
    return res.status(200).json({ success: true, viewedStories: views[accountKey] });
  }

  if (req.method === 'DELETE') {
    // Remove a story from viewed list (for testing/reset purposes)
    const { account, storyId } = req.query;
    
    if (!account || !storyId) {
      return res.status(400).json({ error: 'Account and storyId are required' });
    }

    const views = loadViews();
    const accountKey = account.toLowerCase();
    
    if (views[accountKey]) {
      views[accountKey] = views[accountKey].filter(id => id !== storyId);
      saveViews(views);
    }
    
    return res.status(200).json({ success: true, viewedStories: views[accountKey] || [] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 