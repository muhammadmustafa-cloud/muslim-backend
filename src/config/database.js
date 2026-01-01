import mongoose from 'mongoose';

/**
 * Database connection configuration and utilities
 */
class Database {
  constructor() {
    this.connection = null;
  }

  /**
   * Connect to MongoDB
   */
  async connect(uri) {
    try {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      this.connection = await mongoose.connect(uri, options);
      console.log(`✅ MongoDB Connected: ${this.connection.connection.host}`);
      return this.connection;
    } catch (error) {
      console.error(`❌ MongoDB connection error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('✅ MongoDB Disconnected');
    }
  }

  /**
   * Get connection status
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

export default new Database();

