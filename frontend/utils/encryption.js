import CryptoJS from 'crypto-js';

// Encrypt data using user's personal key
export function encryptData(data, personalKey) {
  if (!personalKey) {
    throw new Error('Personal key is required for encryption');
  }
  
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, personalKey).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt data using user's personal key
export function decryptData(encryptedData, personalKey) {
  if (!personalKey) {
    throw new Error('Personal key is required for decryption');
  }
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, personalKey);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Encrypt file content
export function encryptFile(file, personalKey) {
  return new Promise((resolve, reject) => {
    if (!personalKey) {
      reject(new Error('Personal key is required for encryption'));
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const fileContent = e.target.result;
        const encrypted = CryptoJS.AES.encrypt(fileContent, personalKey).toString();
        resolve(encrypted);
      } catch (error) {
        reject(new Error('Failed to encrypt file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Decrypt file content
export function decryptFile(encryptedData, personalKey, fileName) {
  if (!personalKey) {
    throw new Error('Personal key is required for decryption');
  }
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, personalKey);
    const fileContent = decrypted.toString(CryptoJS.enc.Utf8);
    return fileContent;
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error('Failed to decrypt file');
  }
}

// Generate a unique encryption key for each user
export function generatePersonalKey(password, address) {
  const salt = address.toLowerCase();
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 100000
  });
  return key.toString();
}

// Hash sensitive data for storage
export function hashData(data) {
  return CryptoJS.SHA256(data).toString();
}

// Verify data integrity
export function verifyDataIntegrity(data, hash) {
  const calculatedHash = CryptoJS.SHA256(data).toString();
  return calculatedHash === hash;
} 