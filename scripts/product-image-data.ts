import { PRODUCT_HERO_IMAGES } from '../lib/product-hero-images'

export type ProductImageSet = {
  name: string
  hero: string
  variants: readonly string[]
}

// Public IDs de Cloudinary. No incluyen la versión ni la extensión para que
// cloudinaryUrl pueda aplicar formato, calidad y ancho automáticamente.
export const PRODUCT_IMAGE_SETS = {
  limalaya: {
    name: 'Lima',
    hero: PRODUCT_HERO_IMAGES.limalaya,
    variants: [
      'ChatGPT_Image_13_ago_2026_12_38_12_pz8b1d',
      'ChatGPT_Image_13_ago_2026_12_20_24_bfqxuj',
      'ChatGPT_Image_13_ago_2026_12_10_25_p0ewyg',
      'ChatGPT_Image_13_ago_2026_12_09_06_pttto2',
      'ChatGPT_Image_13_ago_2026_12_58_26_ulrmuo',
    ],
  },
  'vida-fresastica': {
    name: 'Fresa',
    hero: PRODUCT_HERO_IMAGES['vida-fresastica'],
    variants: [
      'ChatGPT_Image_13_ago_2026_12_14_15_eoladx',
      'ChatGPT_Image_13_ago_2026_12_04_06_lkv8as',
      'ChatGPT_Image_13_ago_2026_12_30_01_bkbzr8',
      'ChatGPT_Image_13_ago_2026_12_27_48_jsi97o',
      'ChatGPT_Image_13_ago_2026_12_55_13_qmeemb',
    ],
  },
  'sand-ia': {
    name: 'Sandía',
    hero: PRODUCT_HERO_IMAGES['sand-ia'],
    variants: [
      'ChatGPT_Image_13_ago_2026_12_35_36_rpflku',
      'ChatGPT_Image_13_ago_2026_12_17_22_klnqvw',
      'ChatGPT_Image_13_ago_2026_11_53_45_ulazhc',
      'ChatGPT_Image_13_ago_2026_12_07_06_dztxft',
      'ChatGPT_Image_13_ago_2026_12_47_19_m33jmx',
    ],
  },
  'mera-mora': {
    name: 'Mora',
    hero: PRODUCT_HERO_IMAGES['mera-mora'],
    variants: [
      'ChatGPT_Image_13_ago_2026_12_01_29_dkyvxb',
      'ChatGPT_Image_13_ago_2026_12_34_08_hgizto',
      'ChatGPT_Image_13_ago_2026_12_22_59_ckeypw',
      'ChatGPT_Image_13_ago_2026_12_12_38_xbe0ma',
      'ChatGPT_Image_13_ago_2026_12_53_12_pcprkb',
    ],
  },
} as const satisfies Record<string, ProductImageSet>

export type ProductImageSlug = keyof typeof PRODUCT_IMAGE_SETS
