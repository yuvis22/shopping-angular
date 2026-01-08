import B2 from 'backblaze-b2';

// Validate Backblaze B2 credentials
const validateB2Credentials = (): void => {
  if (
    !process.env.B2_APPLICATION_KEY_ID ||
    process.env.B2_APPLICATION_KEY_ID === 'your_b2_key_id_here'
  ) {
    throw new Error(
      'B2_APPLICATION_KEY_ID is not set in .env file. Please add your Backblaze B2 Application Key ID.'
    );
  }
  if (
    !process.env.B2_APPLICATION_KEY ||
    process.env.B2_APPLICATION_KEY === 'your_b2_application_key_here'
  ) {
    throw new Error(
      'B2_APPLICATION_KEY is not set in .env file. Please add your Backblaze B2 Application Key.'
    );
  }
  if (!process.env.B2_BUCKET_ID || process.env.B2_BUCKET_ID === 'your_bucket_id_here') {
    throw new Error(
      'B2_BUCKET_ID is not set in .env file. Please add your Backblaze B2 Bucket ID.'
    );
  }
  if (!process.env.B2_BUCKET_NAME || process.env.B2_BUCKET_NAME === 'your_bucket_name_here') {
    throw new Error(
      'B2_BUCKET_NAME is not set in .env file. Please add your Backblaze B2 Bucket Name.'
    );
  }
};

// Lazy initialization: Create B2 instance only when needed (after dotenv is loaded)
let b2: B2 | null = null;
let authorized = false;
let downloadUrl = '';

const getB2Instance = (): B2 => {
  if (!b2) {
    // Validate credentials first
    validateB2Credentials();

    // Create B2 instance with environment variables (now loaded)
    b2 = new B2({
      applicationKeyId: process.env.B2_APPLICATION_KEY_ID!,
      applicationKey: process.env.B2_APPLICATION_KEY!,
    });
  }
  return b2;
};

export const authorizeB2 = async (): Promise<void> => {
  if (authorized) return;

  // Get B2 instance (will validate and create if needed)
  const b2Instance = getB2Instance();

  try {
    const authResponse = await b2Instance.authorize();
    authorized = true;
    // Store download URL for constructing file URLs
    downloadUrl = authResponse.data.downloadUrl;
    console.log('✅ Backblaze B2 authorized successfully');
    console.log('📋 Download URL:', downloadUrl);
    console.log('💡 Note: Using fileId-based URLs for private bucket support');
  } catch (error: any) {
    console.error('❌ Backblaze B2 authorization error:', error.message);

    if (
      error.message?.includes('Invalid accountId') ||
      error.message?.includes('applicationKeyId')
    ) {
      console.error('\n💡 Backblaze B2 Setup Instructions:');
      console.error('1. Go to https://secure.backblaze.com/user_buckets.htm');
      console.error('2. Click "App Keys" in the left sidebar');
      console.error('3. Click "Add a New Application Key"');
      console.error('4. Give it a name (e.g., "Shopping App")');
      console.error('5. Select "Read and Write" permissions');
      console.error('6. Select your bucket');
      console.error('7. Copy the "keyID" and "applicationKey"');
      console.error('8. Add them to server/.env:');
      console.error('   B2_APPLICATION_KEY_ID=your_key_id_here');
      console.error('   B2_APPLICATION_KEY=your_application_key_here');
      console.error('   B2_BUCKET_ID=your_bucket_id_here');
      console.error('   B2_BUCKET_NAME=your_bucket_name_here');
    }

    throw error;
  }
};

export const uploadFileToB2 = async (
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> => {
  await authorizeB2();

  const b2Instance = getB2Instance();

  try {
    console.log('🔍 Getting upload URL from B2...');
    // Get upload URL
    const response = await b2Instance.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });
    console.log('✅ Got upload URL from B2');

    const filePath = `products/${fileName}`;
    console.log('📁 File path:', filePath);
    console.log('📏 File size:', fileBuffer.length, 'bytes');

    // Upload file
    console.log('📤 Uploading file to B2...');
    const uploadResponse = await b2Instance.uploadFile({
      uploadUrl: response.data.uploadUrl,
      uploadAuthToken: response.data.authorizationToken,
      fileName: filePath,
      data: fileBuffer,
      mime: contentType,
    });
    console.log('✅ File uploaded successfully');

    const fileId = uploadResponse.data?.fileId;
    if (!fileId) {
      console.error('❌ fileId is missing from upload response:', uploadResponse);
      throw new Error('File ID is missing from B2 upload response');
    }
    console.log('📋 File ID:', fileId);
    const bucketName = process.env.B2_BUCKET_NAME!;

    // For private buckets, use fileId-based URL format
    // Format: https://f{fileId}.{domain}/file/{bucketName}/{filePath}
    // This works for both public and private buckets
    const cleanDownloadUrl = downloadUrl.endsWith('/') ? downloadUrl.slice(0, -1) : downloadUrl;

    // Extract base domain from downloadUrl
    // downloadUrl format: https://f005.backblazeb2.com
    // We need: backblazeb2.com (remove the f### prefix)
    let baseDomain: string;
    const urlMatch = cleanDownloadUrl.match(/https?:\/\/f\d+\.(.+)/);

    if (urlMatch && urlMatch[1]) {
      // Extract base domain (e.g., "backblazeb2.com" from "f005.backblazeb2.com")
      baseDomain = urlMatch[1];
    } else {
      // Fallback: try to extract domain after removing protocol
      const withoutProtocol = cleanDownloadUrl.replace(/^https?:\/\//, '');
      // Remove f### prefix if present
      baseDomain = withoutProtocol.replace(/^f\d+\./, '');
    }

    if (!baseDomain) {
      throw new Error(`Invalid downloadUrl format: ${downloadUrl}. Cannot extract base domain.`);
    }

    if (!fileId) {
      throw new Error('File ID is missing from B2 upload response');
    }

    // For private buckets / CORS, we should use our own proxy
    // Format: {API_URL}/api/images/{fileName}
    // The filename passed to this function is "products/timestamp-name"
    // So we want the URL to be {API_URL}/api/images/timestamp-name
    const fileNameOnly = filePath.replace('products/', '');
    
    // Get API base URL from environment or use default
    // In production, this should be the Render backend URL
    // In development, use localhost:3000
    const apiBaseUrl = process.env.API_BASE_URL || 
                      (process.env.NODE_ENV === 'production' 
                        ? 'https://shopping-angular-li9h.onrender.com'
                        : 'http://localhost:3000');
    
    const proxyUrl = `${apiBaseUrl}/api/images/${fileNameOnly}`;

    console.log('📎 Constructed proxy URL:', proxyUrl);
    console.log('File details:', {
      fileId: fileId,
      fileName: filePath,
      fileNameOnly: fileNameOnly,
      bucketName: bucketName,
      apiBaseUrl: apiBaseUrl,
      fullUrl: proxyUrl,
    });
    
    return proxyUrl;
  } catch (error: any) {
    console.error('❌ Error uploading file to B2:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });

    // Re-throw with more context
    if (error.message) {
      throw new Error(`Backblaze B2 upload failed: ${error.message}`);
    }
    throw error;
  }
};

export const getFileStream = async (fileName: string): Promise<any> => {
  await authorizeB2();
  const b2Instance = getB2Instance();
  
  try {
    const filePath = `products/${fileName}`;
    console.log(`⬇️ Downloading file from B2: ${filePath}`);
    
    // downloadFileByName returns axios response with data as stream if requested
    const response = await b2Instance.downloadFileByName({
      bucketName: process.env.B2_BUCKET_NAME!,
      fileName: filePath,
      responseType: 'stream'
    });
    
    return {
      stream: response.data,
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length']
    };
  } catch (error) {
    console.error('❌ Error downloading file from B2:', error);
    throw error;
  }
};

export const deleteFileFromB2 = async (fileName: string): Promise<void> => {
  await authorizeB2();

  const b2Instance = getB2Instance();

  try {
    const filePath = `products/${fileName}`;

    // List file versions to get the fileId
    const fileInfo = await b2Instance.listFileVersions({
      bucketId: process.env.B2_BUCKET_ID!,
      startFileName: filePath,
      maxFileCount: 1,
    });

    if (fileInfo.data.files && fileInfo.data.files.length > 0) {
      const file = fileInfo.data.files[0];
      await b2Instance.deleteFileVersion({
        fileId: file.fileId,
        fileName: file.fileName,
      });
      console.log(`✅ Deleted file: ${filePath}`);
    } else {
      console.warn(`⚠️ File not found for deletion: ${filePath}`);
    }
  } catch (error) {
    console.error('❌ Error deleting file from B2:', error);
    throw error;
  }
};
