# Environment Setup Guide

## Required Environment Variables

### 1. Create `.env.local` file in the frontend directory

```bash
# Navigate to frontend directory
cd frontend

# Create .env.local file
touch .env.local
```

### 2. Add the following to `.env.local`:

```env
# Server-side encryption key for password storage (32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### 3. Generate a Secure Encryption Key

You can generate a secure 32-character key using one of these methods:

#### Method 1: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Method 2: Using OpenSSL
```bash
openssl rand -hex 32
```

#### Method 3: Online Generator
Use a secure online generator and copy the first 32 characters.

### 4. Example `.env.local` file:

```env
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

## Installation Steps

### 1. Install Dependencies
```bash
cd frontend
npm install crypto-js
```

### 2. Restart Development Server
```bash
npm run dev
```

## Troubleshooting

### Error: "ENCRYPTION_KEY must be exactly 32 characters"
- Make sure your ENCRYPTION_KEY is exactly 32 characters long
- Check that there are no extra spaces or newlines

### Error: "Failed to load resource: 404"
- This is normal for missing avatar images and media files
- These will be created as users upload content

### Error: "500 Internal Server Error"
- Check that your ENCRYPTION_KEY is set correctly
- Restart the development server after setting environment variables

## Security Notes

- **Never commit** the `.env.local` file to version control
- **Use different keys** for development and production
- **Keep your keys secure** and backup safely
- **Rotate keys** periodically in production

## Testing the Setup

1. Start the development server
2. Connect your MetaMask wallet
3. Set a password when prompted
4. Try creating a post and adding comments
5. Verify that the login flow works correctly

The security system should now work properly with encrypted passwords and personal keys! 