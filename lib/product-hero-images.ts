export const PRODUCT_HERO_IMAGES = {
  limalaya: 'ChatGPT_Image_13_ago_2026_11_52_11_ctwjn4',
  'vida-fresastica': 'ChatGPT_Image_13_ago_2026_11_57_07_lndqnf',
  'dulce-delito': 'Choco_hero_ctrqn3',
  'sand-ia': 'ChatGPT_Image_13_ago_2026_12_15_59_rr5fsw',
  'mera-mora': 'ChatGPT_Image_13_ago_2026_11_58_44_i0fwsd',
} as const

export function resolveProductHeroImage(
  slug: string,
  currentPublicId: string | null | undefined
) {
  return PRODUCT_HERO_IMAGES[slug as keyof typeof PRODUCT_HERO_IMAGES] ?? currentPublicId ?? null
}
