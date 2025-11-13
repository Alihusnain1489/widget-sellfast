import { prisma } from './db'

export async function ensureDefaultCategories() {
  try {
    const defaultCategories = [
      { name: "Laptops", description: "Laptops and Notebooks", icon: "💻" },
      { name: "Mobiles", description: "Mobile phones and smartphones", icon: "📱" },
      { name: "Smart Watches", description: "Smart watches and wearables", icon: "⌚" },
      { name: "LEDs", description: "LED displays and monitors", icon: "🖥️" },
      { name: "PC", description: "Desktop computers", icon: "🖥️" },
      { name: "Tablets", description: "Tablets and portable devices", icon: "📱" },
      { name: "iPads", description: "Apple iPad devices", icon: "📱" },
    ]

    for (const cat of defaultCategories) {
      await prisma.itemCategory.upsert({
        where: { name: cat.name },
        update: { description: cat.description, icon: cat.icon },
        create: cat,
      })
    }
    
    console.log('✅ Default categories ensured')
    return true
  } catch (error: any) {
    console.error('❌ Error ensuring default categories:', error?.message || error)
    throw error // Re-throw to let caller handle
  }
}

