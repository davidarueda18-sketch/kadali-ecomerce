import { v2 as cloudinary } from 'cloudinary'

// Inline config for onboarding only — move to .env.local for production
cloudinary.config({
  cloud_name: 'dgwburevf',
  api_key: '937179561552595',
  api_secret: 'skKohVOFtiPqdifS05ZFkX9vX_M',
})

async function main() {
  // 1. Upload a sample image from Cloudinary's demo domain
  console.log('Uploading image...')
  const upload = await cloudinary.uploader.upload(
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    { public_id: 'kadali/test/sample' }
  )
  console.log('Secure URL:', upload.secure_url)
  console.log('Public ID:', upload.public_id)

  // 2. Fetch image metadata
  console.log('\nFetching image details...')
  const details = await cloudinary.api.resource(upload.public_id)
  console.log('Width:', details.width)
  console.log('Height:', details.height)
  console.log('Format:', details.format)
  console.log('File size (bytes):', details.bytes)

  // 3. Generate a transformed URL
  // f_auto: Cloudinary selects the best format for the browser (WebP, AVIF, etc.)
  // q_auto: Cloudinary picks the optimal quality level to reduce size without visible loss
  const transformedUrl = cloudinary.url(upload.public_id, {
    transformation: [{ fetch_format: 'auto', quality: 'auto' }],
    secure: true,
  })

  console.log('\nDone! Click link below to see optimized version of the image. Check the size and the format.')
  console.log(transformedUrl)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
