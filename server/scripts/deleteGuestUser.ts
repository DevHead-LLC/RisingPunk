#!/usr/bin/env ts-node
/**
 * One-time: delete a guest (or any) user by ID and all related data via AccountDeletionService.
 * Use when a guest account is stuck and you need to allow a new guest to be created on the device.
 *
 * Run from server/: npx ts-node scripts/deleteGuestUser.ts <userId>
 * Example: npx ts-node scripts/deleteGuestUser.ts 6982ba1f093c951a2836d15b
 *
 * After running: on the device, tap "Play as Guest" again. The app will get 404 on verify-token,
 * clear stored guest credentials, and create a new guest.
 *
 * Alternative (MongoDB shell / Compass): minimal delete (user + researchUsers only):
 *   db.users.deleteOne({ _id: ObjectId("6982ba1f093c951a2836d15b") })
 *   db.researchUsers.deleteMany({ userId: ObjectId("6982ba1f093c951a2836d15b") })
 */

import mongoose from 'mongoose';
import { getDatabaseName } from './scriptEnv';
import { AccountDeletionService } from '../src/services/AccountDeletionService';

async function main(): Promise<void> {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: npx ts-node scripts/deleteGuestUser.ts <userId>');
    console.error('Example: npx ts-node scripts/deleteGuestUser.ts 6982ba1f093c951a2836d15b');
    process.exit(1);
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error('Invalid userId (must be a valid ObjectId)');
    process.exit(1);
  }

  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not set');
      process.exit(1);
    }

    const dbName = getDatabaseName();
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName,
      appName: 'deleteGuestUser-script',
    });
    console.log('Connected to database:', dbName);

    const result = await AccountDeletionService.deleteAccount(userId);
    console.log('Result:', result.message);
    console.log('Deleted records:', JSON.stringify(result.deletedRecords, null, 2));
    if (result.errors.length > 0) {
      console.error('Errors:', result.errors);
    }

    await mongoose.disconnect();
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
