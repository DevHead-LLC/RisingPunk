const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');
require('dotenv').config();

// Encryption service functions (copied from the TypeScript service)
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for email encryption');
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }
  return key;
}

function hashEmail(email) {
  try {
    const key = getEncryptionKey();
    return CryptoJS.SHA256(email + key).toString();
  } catch (error) {
    console.error('Email hashing failed:', error);
    throw new Error('Failed to hash email');
  }
}

function isEncrypted(value) {
  try {
    if (!value || value.length < 32) return false;
    // Try to decrypt - if it fails, it's not encrypted
    const key = getEncryptionKey();
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

function decryptEmail(encryptedEmail) {
  try {
    const key = getEncryptionKey();
    
    const iv = CryptoJS.enc.Hex.parse(encryptedEmail.substr(0, 32));
    const ciphertext = encryptedEmail.substr(32);
    
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Email decryption failed:', error);
    throw new Error('Failed to decrypt email');
  }
}

async function addEmailHashToUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/risingpunk');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    console.log('Finding users without emailHash...');
    const usersWithoutHash = await usersCollection.find({ emailHash: { $exists: false } }).toArray();
    
    if (usersWithoutHash.length === 0) {
      console.log('All users already have emailHash field');
      return;
    }

    console.log(`Found ${usersWithoutHash.length} users without emailHash field`);

    let processed = 0;
    let errors = 0;

    for (const user of usersWithoutHash) {
      try {
        let originalEmail;
        
        if (isEncrypted(user.email)) {
          originalEmail = decryptEmail(user.email);
        } else {
          originalEmail = user.email;
        }

        const emailHash = hashEmail(originalEmail);
        
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { emailHash } }
        );

        processed++;
        if (processed % 100 === 0) {
          console.log(`Processed ${processed} users...`);
        }
      } catch (error) {
        console.error(`Error processing user ${user._id}:`, error);
        errors++;
      }
    }

    console.log(`Migration completed: ${processed} users processed, ${errors} errors`);
    
    // Verify the migration
    const remainingUsersWithoutHash = await usersCollection.find({ emailHash: { $exists: false } }).count();
    console.log(`Users still without emailHash: ${remainingUsersWithoutHash}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
addEmailHashToUsers().catch(console.error);
