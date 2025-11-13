// Default brand logos/images - always shown in brand selection
// These are the standard brand logos that should always be available
export const DEFAULT_BRANDS = [
  {
    name: 'Apple',
    logo: 'https://cdn.simpleicons.org/apple/000000',
    displayName: 'Apple'
  },
  {
    name: 'Samsung',
    logo: 'https://cdn.simpleicons.org/samsung/1428A0',
    displayName: 'Samsung'
  },
  {
    name: 'Google',
    logo: 'https://cdn.simpleicons.org/google/4285F4',
    displayName: 'Google'
  },
  {
    name: 'Xiaomi',
    logo: 'https://cdn.simpleicons.org/xiaomi/FF6900',
    displayName: 'Xiaomi'
  },
  {
    name: 'OnePlus',
    logo: 'https://cdn.simpleicons.org/oneplus/F5010C',
    displayName: 'OnePlus'
  },
  {
    name: 'Huawei',
    logo: 'https://cdn.simpleicons.org/huawei/FF0000',
    displayName: 'Huawei'
  },
  {
    name: 'Oppo',
    logo: 'https://cdn.simpleicons.org/oppo/1DB954',
    displayName: 'Oppo'
  },
  {
    name: 'Vivo',
    logo: 'https://cdn.simpleicons.org/vivo/415F96',
    displayName: 'Vivo'
  },
  {
    name: 'Realme',
    logo: 'https://cdn.simpleicons.org/realme/FFD700',
    displayName: 'Realme'
  },
  {
    name: 'Motorola',
    logo: 'https://cdn.simpleicons.org/motorola/E1140A',
    displayName: 'Motorola'
  },
  {
    name: 'Honor',
    logo: 'https://cdn.simpleicons.org/honor/00D9FF',
    displayName: 'Honor'
  },
  {
    name: 'Nothing',
    logo: 'https://cdn.simpleicons.org/nothing/000000',
    displayName: 'Nothing'
  },
  {
    name: 'Poco',
    logo: 'https://cdn.simpleicons.org/xiaomi/FF6900',
    displayName: 'Poco'
  },
  {
    name: 'ZTE',
    logo: 'https://cdn.simpleicons.org/zte/0096FF',
    displayName: 'ZTE'
  },
]

export function getDefaultBrand(brandName: string) {
  return DEFAULT_BRANDS.find(brand => 
    brand.name.toLowerCase() === brandName.toLowerCase() ||
    brand.displayName.toLowerCase() === brandName.toLowerCase()
  )
}

export function getDefaultBrandLogo(brandName: string): string | null {
  const brand = getDefaultBrand(brandName)
  return brand ? brand.logo : null
}

