import B2 from 'backblaze-b2';

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID!,
  applicationKey: process.env.B2_APPLICATION_KEY!,
});

let authorized = false;
let downloadUrl = '';

export const authorizeB2 = async (): Promise<void> => {
  if (authorized) return;

  try {
    const authResponse = await b2.authorize();
    authorized = true;
    // Store download URL for constructing public URLs
    downloadUrl = authResponse.data.downloadUrl;
    console.log('✅ Backblaze B2 authorized successfully');
  } catch (error) {
    console.error('❌ Backblaze B2 authorization error:', error);
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
