import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import { USER_ROLES } from '../utils/constants.js';
import database from '../config/database.js';

// Load environment variables
dotenv.config();

/**
 * Seed script to create an initial admin user
 * Usage: node src/scripts/seedUser.js
 * Or with custom data: node src/scripts/seedUser.js "Admin Name" "admin@example.com" "password123"
 */

const createAdminUser = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/muslim-dall-mill';
    await database.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get user data from command line arguments or use defaults
    const name = process.argv[2] || 'Admin User';
    const email = process.argv[3] || 'admin@muslimdaalmill.com';
    const password = process.argv[4] || 'admin123';

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email, role: USER_ROLES.ADMIN });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with this email:', email);
      console.log('   If you want to create a new admin, use a different email or delete the existing one.');
      process.exit(0);
    }

    // Check if any user exists
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log(`⚠️  Database already has ${userCount} user(s).`);
      console.log('   Creating additional admin user...');
    }

    // Create admin user
    const adminUser = await User.create({
      name,
      email,
      password,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name:', adminUser.name);
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('Password:', password, '(Please change this after first login)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Disconnect from database
    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.error('   Email already exists. Please use a different email.');
    }
    await database.disconnect();
    process.exit(1);
  }
};

// Run the script
createAdminUser();

