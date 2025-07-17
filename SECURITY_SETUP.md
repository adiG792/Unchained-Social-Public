# Security Architecture - Unchained Social

## Overview

This platform implements a dual-key security system:

1. **MetaMask Private Key**: Used for blockchain transactions and wallet authentication
2. **Personal Encryption Key**: Used for encrypting user data (posts, stories, comments, messages)

## Security Features

### 1. Personal Encryption Key
- Each user has a unique encryption key derived from their password and wallet address
- This key is separate from their MetaMask private key
- Used to encrypt all personal data before storage

### 2. Password-Based Authentication
- Users must set a password when first connecting their wallet
- Password is encrypted and stored securely on the server
- Required for accessing encrypted data

### 3. Data Encryption
- **Posts**: Encrypted with personal key before storage
- **Stories**: Encrypted with personal key
- **Comments**: Encrypted with personal key
- **Messages**: Encrypted with personal key
- **Profile Data**: Encrypted with personal key

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Server-side encryption key for password storage (32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**Important**: Generate a secure 32-character random string for the encryption key.

### 2. Install Dependencies

```bash
cd frontend
npm install crypto-js
```

### 3. Security Best Practices

1. **Never commit the encryption key** to version control
2. **Use different keys** for development and production
3. **Rotate keys** periodically in production
4. **Backup keys** securely
5. **Monitor access** to encrypted data

## User Flow

### New User
1. Connect MetaMask wallet
2. Set password (minimum 8 characters)
3. Personal encryption key is generated
4. Access to encrypted features unlocked

### Existing User
1. Connect MetaMask wallet
2. Enter password
3. Personal encryption key is derived
4. Access to encrypted features unlocked

### Account Switching
1. Change MetaMask account
2. Login modal appears
3. Enter password for new account
4. Personal encryption key derived for new account

## Data Storage Structure

```
media/
├── {address}/
│   ├── profile/
│   │   ├── password.json (encrypted)
│   │   ├── avatar.jpg
│   │   └── profile.json (encrypted)
│   ├── posts/
│   │   ├── {postId}/
│   │   │   ├── content (encrypted)
│   │   │   └── comments/ (encrypted)
│   └── stories/
│       └── {storyId} (encrypted)
```

## API Endpoints

### Password Management
- `POST /api/setPassword` - Set user password
- `GET /api/setPassword` - Check if password exists
- `POST /api/verifyPassword` - Verify password and get personal key

### Data Encryption
All existing APIs now support encrypted data when personal key is provided.

## Security Considerations

1. **Key Storage**: Personal keys are stored in session storage only
2. **Password Storage**: Passwords are encrypted on server with server key
3. **Data Access**: All encrypted data requires personal key
4. **Session Management**: Keys are cleared when wallet disconnects
5. **Account Isolation**: Each wallet address has separate encryption

## Testing

To test the security system:

1. Set up environment variables
2. Install dependencies
3. Start the development server
4. Connect a MetaMask wallet
5. Set a password
6. Verify encrypted data access

## Production Deployment

1. Generate secure encryption keys
2. Set environment variables
3. Use HTTPS in production
4. Implement rate limiting
5. Monitor for security events
6. Regular security audits 