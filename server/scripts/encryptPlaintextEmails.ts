#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import dotenvFlow from 'dotenv-flow';
import { EncryptionService } from '../src/services/EncryptionService';
import { User } from '../src/models/User';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFileMap: Record<string, string> = {
  'development': 'dev',
  'production': 'prod'
};
const mappedNodeEnv = envFileMap[nodeEnv] || nodeEnv;

dotenvFlow.config({ 
  node_env: mappedNodeEnv,
  silent: true 
});

if (process.env.NODE_ENV !== nodeEnv) {
  process.env.NODE_ENV = nodeEnv;
}

const getDatabaseName = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  switch (nodeEnv) {
    case 'production':
      return 'RisingPunkProd';
    case 'staging':
    case 'development':
    default:
      return 'RisingPunk';
  }
};

async function encryptPlaintextEmails() {
  try {
    console.log('🔄 Starting email encryption migration...\n');

    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable is not set');
      process.exit(1);
    }

    if (!process.env.ENCRYPTION_KEY) {
      console.error('❌ ENCRYPTION_KEY environment variable is not set');
      process.exit(1);
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: getDatabaseName(),
      appName: 'encryptPlaintextEmails-script'
    });

    console.log('✅ Connected to database\n');

    const users = await User.find({ email: { $exists: true, $ne: '' } });

    console.log(`📊 Found ${users.length} users with emails\n`);

    let processed = 0;
    let encrypted = 0;
    let errors = 0;
    const plaintextUsers: Array<{ id: string; email: string; handle: string }> = [];

    for (const user of users) {
      try {
        let needsSave = false;
        const currentEmail = user.email;
        const newEmail = user.emailVerificationNewEmail;

        if (currentEmail && !EncryptionService.isEncrypted(currentEmail)) {
          plaintextUsers.push({
            id: (user._id as mongoose.Types.ObjectId).toString(),
            email: currentEmail,
            handle: user.handle
          });

          const normalizedEmail = currentEmail.trim().toLowerCase();
          user.setEncryptedEmail(normalizedEmail);
          needsSave = true;
          encrypted++;
          console.log(`✅ Encrypted email for user: ${user.handle} (${user._id})`);
        }

        if (newEmail && !EncryptionService.isEncrypted(newEmail)) {
          const normalizedNewEmail = newEmail.trim().toLowerCase();
          user.emailVerificationNewEmail = EncryptionService.encryptEmail(normalizedNewEmail);
          needsSave = true;
          encrypted++;
          console.log(`✅ Encrypted emailVerificationNewEmail for user: ${user.handle} (${user._id})`);
        }

        if (needsSave) {
          await user.save();
        }

        processed++;

        if (processed % 100 === 0) {
          console.log(`\n📈 Progress: ${processed}/${users.length} users processed\n`);
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user._id} (${user.handle}):`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${processed}`);
    console.log(`Emails encrypted: ${encrypted}`);
    console.log(`Errors: ${errors}`);
    console.log('='.repeat(60));

    if (plaintextUsers.length > 0) {
      console.log('\n📋 Users with previously plaintext emails:');
      plaintextUsers.forEach(u => {
        console.log(`  - ${u.handle} (${u.id}): ${u.email}`);
      });
    }

    console.log('\n✅ Migration completed successfully\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

encryptPlaintextEmails().catch(console.error);
