import mongoose from 'mongoose';
import database from '../config/database.js';

const clearOldLabourRates = async () => {
  try {
    await database();
    console.log('Connected to database');
    
    // Drop the old collection to remove the old schema and indexes
    await mongoose.connection.db.collection('labourrates').drop();
    console.log('Old labourrates collection dropped successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

clearOldLabourRates();
