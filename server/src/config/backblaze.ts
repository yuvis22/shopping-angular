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

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID!,
  applicationKey: process.env.B2_APPLICATION_KEY!,
});

let authorized = false;
let downloadUrl = '';

export const authorizeB2 = async (): Promise<void> => {
  if (authorized) return;

  // Validate credentials before attempting authorization
  validateB2Credentials();

  try {
    const authResponse = await b2.authorize();
    authorized = true;
    // Store download URL for constructing public URLs
    downloadUrl = authResponse.data.downloadUrl;
    console.log('✅ Backblaze B2 authorized successfully');
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

  try {
    // Get upload URL
    const response = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });

    const filePath = `products/${fileName}`;

    // Upload file
    const uploadResponse = await b2.uploadFile({
      uploadUrl: response.data.uploadUrl,
      uploadAuthToken: response.data.authorizationToken,
      fileName: filePath,
      data: fileBuffer,
      mime: contentType,
    });

    // Construct public URL using download URL from authorization
    // Format: https://f{fileId}.{downloadUrl}/file/{bucketName}/{filePath}
    const fileId = uploadResponse.data.fileId;
    const bucketName = process.env.B2_BUCKET_NAME!;

    // Use the download URL from authorization response
    const fileUrl = `${downloadUrl}/file/${bucketName}/${filePath}`;

    return fileUrl;
  } catch (error) {
    console.error('❌ Error uploading file to B2:', error);
    throw error;
  }
};

export const deleteFileFromB2 = async (fileName: string): Promise<void> => {
  await authorizeB2();

  try {
    const filePath = `products/${fileName}`;

    // List file versions to get the fileId
    const fileInfo = await b2.listFileVersions({
      bucketId: process.env.B2_BUCKET_ID!,
      startFileName: filePath,
      maxFileCount: 1,
    });

    if (fileInfo.data.files && fileInfo.data.files.length > 0) {
      const file = fileInfo.data.files[0];
      await b2.deleteFileVersion({
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
