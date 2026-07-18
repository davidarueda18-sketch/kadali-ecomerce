// Imagen por defecto cuando un producto no tiene una imagen asignada
export const PLACEHOLDER_PUBLIC_ID = 'image-placeholder_qsc1xi'

export function cloudinaryUrl(
  publicId: string | null | undefined,
  width = 600
) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const id = publicId || PLACEHOLDER_PUBLIC_ID
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_${width}/${id}`
}
