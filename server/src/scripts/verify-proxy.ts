import axios from 'axios';

async function verifyProxy() {
  console.log('🔍 Verifying B2 Image Proxy...');
  const baseUrl = 'http://localhost:3000/api';

  try {
    // 1. Fetch products to get a proxy URL from existing data
    console.log('📦 Fetching products to find an image URL...');
    const productsRes = await axios.get(`${baseUrl}/products`);
    const products = productsRes.data;

    if (!products || products.length === 0) {
      console.warn('⚠️ No products found. Cannot verify proxy with existing data.');
      return;
    }

    const productWithImage = products.find((p: any) => p.imageUrl && p.imageUrl.includes('/api/images/'));
    
    if (!productWithImage) {
      console.warn('⚠️ No products with proxy URL found. Maybe transformation logic failed or no images yet.');
      console.log('Sample product imageUrl:', products[0].imageUrl);
      return;
    }

    const proxyUrl = productWithImage.imageUrl;
    console.log(`✅ Found proxy URL: ${proxyUrl}`);

    // 2. Fetch the image via proxy
    // Construct full URL if relative
    const fetchUrl = proxyUrl.startsWith('http') ? proxyUrl : `http://localhost:3000${proxyUrl}`;
    console.log(`🖼️ Fetching image from: ${fetchUrl}`);

    const imageRes = await axios.get(fetchUrl, { responseType: 'stream' });
    
    if (imageRes.status === 200) {
      console.log('✅ Image fetched successfully via proxy!');
      console.log('Content-Type:', imageRes.headers['content-type']);
      console.log('Content-Length:', imageRes.headers['content-length']);
    } else {
      console.error(`❌ Failed to fetch image. Status: ${imageRes.status}`);
    }

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

verifyProxy();
