import mongoose from 'mongoose';

import { env } from './env.js';

export async function connectDatabase() {
  try {
    await mongoose.connect(
      env.MONGODB_URI
    );

    console.log(
      'MongoDB connected successfully.'
    );

    return mongoose.connection;
  } catch (error) {
    console.error(
      'MongoDB connection failed:',
      error.message
    );

    throw error;
  }
}