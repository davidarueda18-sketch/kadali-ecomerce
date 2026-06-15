export function cloudinaryUrl(publicId: string, width = 600) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_${width}/${publicId}`
}
