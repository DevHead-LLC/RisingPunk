#!/usr/bin/env node

/**
 * Migration script to encrypt existing email addresses in the database
 * Run this script after setting up the ENCRYPTION_KEY environment variable
 * 
 * Usage: node scripts/encryptExistingEmails.js
 */

require('dotenv-flow').config();
const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

// Check for encryption key
if (!process.env.ENCRYPTION_KEY) {
  console.error('❌ ENCRYPTION_KEY environment variable is required');
  console.error('Please set ENCRYPTION_KEY in your .env file');
  process.exit(1);
}

if (process.env.ENCRYPTION_KEY.length < 32) {
  console.error('❌ ENCRYPTION_KEY must be at least 32 characters long');
  process.exit(1);
}

// Encryption functions
function encryptEmail(email) {
  const key = process.env.ENCRYPTION_KEY;
  const iv = CryptoJS.lib.WordArray.random(16);
  
  const encrypted = CryptoJS.AES.encrypt(email, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return iv.toString() + encrypted.toString();
}

function isEncrypted(value) {
  try {
    if (!value || value.length < 32) return false;
    const key = process.env.ENCRYPTION_KEY;
    const iv = CryptoJS.enc.Hex.parse(value.substr(0, 32));
    const ciphertext = value.substr(32);
    
    CryptoJS.AES.decrypt(ciphertext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return true;
  } catch {
    return false;
  }
}

async function migrateEmails() {
  try {    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'RisingPunk'
    });    
    // Get users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find all users with unencrypted emails
    const users = await usersCollection.find({}).toArray();
    
    let encryptedCount = 0;
    let alreadyEncryptedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        if (!user.email) {
          continue;
        }
        
        if (isEncrypted(user.email)) {
          alreadyEncryptedCount++;
          continue;
        }
        
        // Encrypt the email
        const encryptedEmail = encryptEmail(user.email);
        
        // Update the user
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { email: encryptedEmail } }
        );
        
        encryptedCount++;
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to encrypt email for user ${user.handle || user._id}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration
migrateEmails().catch(console.error);
