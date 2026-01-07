import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not set in .env file');
      console.error('Please add your MongoDB Atlas connection string to server/.env');
      process.exit(1);
      return;
    }

    // Mask password in logs for security
    const maskedUri = mongoUri.replace(/:[^:@]+@/, ':****@');
    console.log('🔄 Connecting to MongoDB Atlas...');
    console.log(`   Connection: ${maskedUri.split('@')[1] || 'MongoDB Atlas'}`);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority',
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('\n💡 Fix MongoDB Atlas Connection:');
      console.error('1. Go to MongoDB Atlas → Network Access');
      console.error('2. Click "Add IP Address" → "Allow Access from Anywhere" (0.0.0.0/0)');
      console.error('3. Wait 1-2 minutes, then restart server');
      console.error('4. Verify connection string format in server/.env:');
      console.error(
        '   mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority'
      );
    } else if (error.message.includes('authentication')) {
      console.error('\n💡 Authentication Error:');
      console.error('1. Check username and password in connection string');
      console.error('2. URL-encode special characters in password (@ → %40, etc.)');
      console.error('3. Verify database user exists in MongoDB Atlas');
    }

    process.exit(1);
  }
};
