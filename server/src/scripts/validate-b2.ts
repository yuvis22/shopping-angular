import * as dotenv from 'dotenv';
import { resolve } from 'path';
import B2 from 'backblaze-b2';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function validateB2Config() {
  console.log('🔍 Validating Backblaze B2 Configuration...\n');

  // Check if all required variables are set
  const requiredVars = {
    B2_APPLICATION_KEY_ID: process.env.B2_APPLICATION_KEY_ID,
    B2_APPLICATION_KEY: process.env.B2_APPLICATION_KEY,
    B2_BUCKET_ID: process.env.B2_BUCKET_ID,
    B2_BUCKET_NAME: process.env.B2_BUCKET_NAME,
  };

  let allSet = true;
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value.includes('your_') || value.includes('here')) {
      console.error(`❌ ${key} is not set or has placeholder value`);
      allSet = false;
    } else {
      // Mask sensitive values
      const masked = key.includes('KEY') 
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
        : value;
      console.log(`✅ ${key}: ${masked}`);
    }
  }

  if (!allSet) {
    console.error('\n❌ Some B2 credentials are missing or have placeholder values');
    process.exit(1);
  }

  console.log('\n🔐 Testing Backblaze B2 connection...');

  try {
    const b2 = new B2({
      applicationKeyId: process.env.B2_APPLICATION_KEY_ID!,
      applicationKey: process.env.B2_APPLICATION_KEY!,
    });

    const authResponse = await b2.authorize();
    console.log('✅ Backblaze B2 authorization successful');
    console.log('📋 Download URL:', authResponse.data.downloadUrl);

    // Test getting upload URL
    const uploadUrlResponse = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });
    console.log('✅ Upload URL retrieved successfully');
    console.log('📦 Bucket ID is valid');

    // Test listing files in bucket
    try {
      const fileList = await b2.listFileNames({
        bucketId: process.env.B2_BUCKET_ID!,
        maxFileCount: 1,
      });
      console.log('✅ Bucket access verified');
      console.log(`📁 Bucket name: ${process.env.B2_BUCKET_NAME}`);
    } catch (listError: any) {
      console.warn('⚠️ Could not list files (this is okay if bucket is empty):', listError.message);
    }

    console.log('\n✅ All B2 configuration checks passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Backblaze B2 connection failed:');
    console.error('Error:', error.message);
    
    if (error.message?.includes('Invalid accountId') || error.message?.includes('applicationKeyId')) {
      console.error('\n💡 Possible issues:');
      console.error('1. B2_APPLICATION_KEY_ID is incorrect');
      console.error('2. B2_APPLICATION_KEY is incorrect');
      console.error('3. The application key was deleted or disabled');
    } else if (error.message?.includes('bucket')) {
      console.error('\n💡 Possible issues:');
      console.error('1. B2_BUCKET_ID is incorrect');
      console.error('2. The bucket was deleted');
      console.error('3. The application key doesn\'t have access to this bucket');
    }
    
    process.exit(1);
  }
}

validateB2Config();



