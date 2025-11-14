import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

// AI-powered specification generator based on category and brand
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { categoryId, companyId } = body

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Fetch category and brand information
    const category = await prisma.itemCategory.findUnique({
      where: { id: categoryId }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    let company = null
    if (companyId) {
      company = await prisma.company.findUnique({
        where: { id: companyId }
      })
    }

    // Get existing specifications for this category
    const existingSpecs = await prisma.categorySpecification.findMany({
      where: { categoryId },
      orderBy: { order: 'asc' }
    })

    const existingSpecNames = new Set(existingSpecs.map(s => s.name.toLowerCase()))

    // Use AI to generate relevant specifications
    const aiGeneratedSpecs = await generateSpecificationsWithAI(
      category.name,
      company?.name || null
    )

    // Filter out specs that already exist and ensure all are select type
    const newSpecs = aiGeneratedSpecs
      .filter(spec => !existingSpecNames.has(spec.name.toLowerCase()))
      .map(spec => ({
        ...spec,
        valueType: 'select', // Force all to be select type
        options: spec.options || [] // Ensure options array exists
      }))

    // Auto-create missing specifications
    const createdSpecs = []
    let orderCounter = existingSpecs.length > 0 
      ? Math.max(...existingSpecs.map(s => s.order || 0)) + 1 
      : 1

    for (const spec of newSpecs) {
      try {
        // Ensure options is a valid array with at least 2 items
        let optionsArray = Array.isArray(spec.options) ? spec.options : []
        if (optionsArray.length < 2) {
          // Generate default options if not enough provided
         optionsArray = generateDefaultOptions(spec.name, category.name, company?.name ?? null)
        }

        const created = await prisma.categorySpecification.create({
          data: {
            categoryId,
            name: spec.name,
            valueType: 'select', // Always select
            options: JSON.stringify(optionsArray),
            icon: spec.icon || null,
            order: orderCounter++,
            isRequired: spec.isRequired || false
          }
        })

        createdSpecs.push({
          ...created,
          options: optionsArray
        })
      } catch (error: any) {
        console.error(`Error creating specification "${spec.name}":`, error)
        // Continue with other specs even if one fails
        if (error.code !== 'P2002') {
          // P2002 is unique constraint - spec might have been created by another request
          console.error(`Failed to create spec: ${spec.name}`, error.message)
        }
      }
    }

    // Return all specifications (existing + newly created)
    const allSpecs = await prisma.categorySpecification.findMany({
      where: { categoryId },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // Parse options for all specs
    const specsWithParsedOptions = allSpecs.map(spec => ({
      ...spec,
      options: spec.options ? (typeof spec.options === 'string' ? JSON.parse(spec.options) : spec.options) : []
    }))

    return NextResponse.json({
      success: true,
      category: {
        id: category.id,
        name: category.name
      },
      brand: company ? {
        id: company.id,
        name: company.name
      } : null,
      existingSpecs: existingSpecs.length,
      createdSpecs: createdSpecs.length,
      specifications: specsWithParsedOptions,
      newlyCreated: createdSpecs
    })
  } catch (error: any) {
    console.error('Error analyzing specifications:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// AI-powered specification generator
async function generateSpecificationsWithAI(
  categoryName: string,
  brandName: string | null
): Promise<Array<{
  name: string
  valueType: string
  options: string[]
  icon?: string
  isRequired?: boolean
}>> {
  const context = {
    category: categoryName.toLowerCase(),
    brand: brandName?.toLowerCase() || null
  }

  const specifications: Array<{
    name: string
    valueType: string
    options: string[]
    icon?: string
    isRequired?: boolean
  }> = []

  // LAPTOPS
  if (context.category.includes('laptop') || context.category.includes('macbook') || context.category.includes('notebook')) {
    specifications.push(
      // Required specifications
      { name: 'Processor', valueType: 'select', options: getProcessorOptions(context.brand), isRequired: true },
      { name: 'RAM', valueType: 'select', options: ['4GB', '8GB', '16GB', '32GB', '64GB', '96GB', '128GB'], isRequired: true },
      { name: 'Storage Type', valueType: 'select', options: ['SSD', 'HDD', 'Hybrid (SSD+HDD)', 'eMMC'], isRequired: true },
      { name: 'Storage Capacity', valueType: 'select', options: ['128GB', '256GB', '512GB', '1TB', '2TB', '4TB', '8TB'], isRequired: true },
      { name: 'Screen Size', valueType: 'select', options: ['11"', '12"', '13"', '13.3"', '14"', '15"', '15.6"', '16"', '17"', '17.3"'], isRequired: true },
      { name: 'Operating System', valueType: 'select', options: getOSOptions(context.brand), isRequired: true },
      { name: 'Condition', valueType: 'select', options: ['Brand New', 'Open Box', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'], isRequired: true },
      
      // Optional specifications
      { name: 'Graphics Card', valueType: 'select', options: getGraphicsCardOptions(context.brand), isRequired: false },
      { name: 'Display Type', valueType: 'select', options: ['LED', 'IPS', 'OLED', 'Retina', 'Mini-LED', '4K', 'Full HD', 'HD'], isRequired: false },
      { name: 'Refresh Rate', valueType: 'select', options: ['60Hz', '90Hz', '120Hz', '144Hz', '165Hz', '240Hz'], isRequired: false },
      { name: 'Touchscreen', valueType: 'select', options: ['Yes', 'No'], isRequired: false },
      { name: 'Backlit Keyboard', valueType: 'select', options: ['Yes', 'No', 'RGB'], isRequired: false },
      { name: 'Battery Life', valueType: 'select', options: ['3-5 hours', '5-7 hours', '7-10 hours', '10-12 hours', '12-15 hours', '15+ hours'], isRequired: false },
      { name: 'Weight', valueType: 'select', options: ['Under 1kg', '1-1.5kg', '1.5-2kg', '2-2.5kg', '2.5-3kg', 'Over 3kg'], isRequired: false },
      { name: 'Color', valueType: 'select', options: getColorOptions(context.brand), isRequired: false },
      { name: 'Ports', valueType: 'select', options: ['USB-C', 'USB-A', 'HDMI', 'Thunderbolt', 'Ethernet', 'SD Card', 'Multiple Ports'], isRequired: false },
      { name: 'Webcam', valueType: 'select', options: ['720p', '1080p', '2K', '4K', 'No Webcam'], isRequired: false },
      { name: 'Fingerprint Scanner', valueType: 'select', options: ['Yes', 'No'], isRequired: false },
      { name: 'Warranty', valueType: 'select', options: ['No Warranty', '3 Months', '6 Months', '1 Year', '2 Years', '3 Years', 'Extended Warranty'], isRequired: false },
      { name: 'Build Material', valueType: 'select', options: ['Plastic', 'Aluminum', 'Magnesium Alloy', 'Carbon Fiber', 'Metal'], isRequired: false }
    )
  } 
  // MOBILE PHONES
  else if (context.category.includes('mobile') || context.category.includes('phone') || context.category.includes('smartphone') || context.category.includes('iphone')) {
    specifications.push(
      // Required specifications
      { name: 'Processor', valueType: 'select', options: getMobileProcessorOptions(context.brand), isRequired: true },
      { name: 'RAM', valueType: 'select', options: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '18GB', '24GB'], isRequired: true },
      { name: 'Storage', valueType: 'select', options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'], isRequired: true },
      { name: 'Screen Size', valueType: 'select', options: ['4.7"', '5.4"', '5.5"', '6.0"', '6.1"', '6.2"', '6.3"', '6.4"', '6.5"', '6.6"', '6.7"', '6.8"', '6.9"'], isRequired: true },
      { name: 'Operating System', valueType: 'select', options: getMobileOSOptions(context.brand), isRequired: true },
      { name: 'Condition', valueType: 'select', options: ['Brand New', 'Open Box', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor', 'For Parts'], isRequired: true },
      
      // Optional specifications
      { name: 'Display Type', valueType: 'select', options: ['AMOLED', 'Super AMOLED', 'OLED', 'LCD', 'IPS LCD', 'Retina', 'Dynamic AMOLED'], isRequired: false },
      { name: 'Refresh Rate', valueType: 'select', options: ['60Hz', '90Hz', '120Hz', '144Hz', 'Adaptive'], isRequired: false },
      { name: 'Main Camera', valueType: 'select', options: ['12MP', '16MP', '48MP', '50MP', '64MP', '108MP', '200MP'], isRequired: false },
      { name: 'Camera Setup', valueType: 'select', options: ['Single', 'Dual', 'Triple', 'Quad', 'Penta'], isRequired: false },
      { name: 'Front Camera', valueType: 'select', options: ['5MP', '8MP', '12MP', '16MP', '20MP', '32MP', '44MP'], isRequired: false },
      { name: 'Battery Capacity', valueType: 'select', options: ['2000-3000 mAh', '3000-4000 mAh', '4000-5000 mAh', '5000-6000 mAh', '6000-7000 mAh', '7000+ mAh'], isRequired: false },
      { name: 'Fast Charging', valueType: 'select', options: ['No Fast Charging', '18W', '25W', '33W', '45W', '65W', '80W', '100W+'], isRequired: false },
      { name: 'Wireless Charging', valueType: 'select', options: ['Yes', 'No'], isRequired: false },
      { name: 'Network', valueType: 'select', options: ['3G', '4G LTE', '5G', '5G+'], isRequired: false },
      { name: 'SIM Type', valueType: 'select', options: ['Single SIM', 'Dual SIM', 'eSIM', 'Dual SIM + eSIM'], isRequired: false },
      { name: 'Expandable Storage', valueType: 'select', options: ['Yes (MicroSD)', 'No'], isRequired: false },
      { name: 'Color', valueType: 'select', options: getMobileColorOptions(context.brand), isRequired: false },
      { name: 'Fingerprint Scanner', valueType: 'select', options: ['In-Display', 'Side-Mounted', 'Rear-Mounted', 'No'], isRequired: false },
      { name: 'Face Unlock', valueType: 'select', options: ['Yes', 'No', 'Face ID'], isRequired: false },
      { name: 'Water Resistance', valueType: 'select', options: ['IP67', 'IP68', 'IP69', 'No'], isRequired: false },
      { name: 'NFC', valueType: 'select', options: ['Yes', 'No'], isRequired: false },
      { name: 'Warranty', valueType: 'select', options: ['No Warranty', '3 Months', '6 Months', '1 Year', '2 Years', 'Extended Warranty'], isRequired: false },
      { name: 'PTA Approved', valueType: 'select', options: ['Yes', 'No', 'Not Applicable'], isRequired: false }
    )
  } 
  // TABLETS
  else if (context.category.includes('tablet') || context.category.includes('ipad')) {
    specifications.push(
      // Required specifications
      { name: 'Processor', valueType: 'select', options: getTabletProcessorOptions(context.brand), isRequired: true },
      { name: 'RAM', valueType: 'select', options: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'], isRequired: true },
      { name: 'Storage', valueType: 'select', options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'], isRequired: true },
      { name: 'Screen Size', valueType: 'select', options: ['7"', '8"', '8.3"', '9.7"', '10.2"', '10.5"', '10.9"', '11"', '12.4"', '12.9"', '13"'], isRequired: true },
      { name: 'Operating System', valueType: 'select', options: getTabletOSOptions(context.brand), isRequired: true },
      { name: 'Condition', valueType: 'select', options: ['Brand New', 'Open Box', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'], isRequired: true },
      
      // Optional specifications
      { name: 'Display Type', valueType: 'select', options: ['LCD', 'IPS LCD', 'AMOLED', 'Super AMOLED', 'Retina', 'Liquid Retina', 'Mini-LED'], isRequired: false },
      { name: 'Refresh Rate', valueType: 'select', options: ['60Hz', '90Hz', '120Hz', 'ProMotion (120Hz)'], isRequired: false },
      { name: 'Connectivity', valueType: 'select', options: ['Wi-Fi Only', 'Wi-Fi + Cellular (4G)', 'Wi-Fi + 5G'], isRequired: false },
      { name: 'SIM Type', valueType: 'select', options: ['No SIM', 'Nano SIM', 'eSIM', 'Nano SIM + eSIM'], isRequired: false },
      { name: 'Camera', valueType: 'select', options: ['5MP', '8MP', '12MP', 'Dual Camera', 'No Camera'], isRequired: false },
      { name: 'Front Camera', valueType: 'select', options: ['2MP', '5MP', '7MP', '8MP', '12MP'], isRequired: false },
      { name: 'Battery Capacity', valueType: 'select', options: ['4000-5000 mAh', '5000-6000 mAh', '6000-7000 mAh', '7000-8000 mAh', '8000-10000 mAh', '10000+ mAh'], isRequired: false },
      { name: 'Battery Life', valueType: 'select', options: ['6-8 hours', '8-10 hours', '10-12 hours', '12-15 hours', '15+ hours'], isRequired: false },
      { name: 'Stylus Support', valueType: 'select', options: ['Apple Pencil', 'S Pen', 'Generic Stylus', 'No'], isRequired: false },
      { name: 'Keyboard Compatible', valueType: 'select', options: ['Yes', 'No', 'Magic Keyboard', 'Smart Keyboard'], isRequired: false },
      { name: 'Color', valueType: 'select', options: getColorOptions(context.brand), isRequired: false },
      { name: 'Speakers', valueType: 'select', options: ['Mono', 'Stereo', 'Quad Speakers', 'Dolby Atmos'], isRequired: false },
      { name: 'Fingerprint Scanner', valueType: 'select', options: ['Yes', 'No', 'Touch ID'], isRequired: false },
      { name: 'Face Unlock', valueType: 'select', options: ['Yes', 'No', 'Face ID'], isRequired: false },
      { name: 'Expandable Storage', valueType: 'select', options: ['Yes (MicroSD)', 'No'], isRequired: false },
      { name: 'Warranty', valueType: 'select', options: ['No Warranty', '3 Months', '6 Months', '1 Year', '2 Years', 'Extended Warranty'], isRequired: false }
    )
  } 
  // SMARTWATCHES
  else if (context.category.includes('watch') || context.category.includes('smartwatch') || context.category.includes('wearable')) {
    specifications.push(
      // Required specifications
      { name: 'Display Size', valueType: 'select', options: ['38mm', '40mm', '41mm', '42mm', '44mm', '45mm', '46mm', '47mm', '49mm', '50mm'], isRequired: true },
      { name: 'Operating System', valueType: 'select', options: getWatchOSOptions(context.brand), isRequired: true },
      { name: 'Condition', valueType: 'select', options: ['Brand New', 'Open Box', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'], isRequired: true },
      
      // Optional specifications
      { name: 'Display Type', valueType: 'select', options: ['AMOLED', 'Super AMOLED', 'LCD', 'OLED', 'Retina', 'Sapphire Crystal'], isRequired: false },
      { name: 'Always-On Display', valueType: 'select', options: ['Yes', 'No'], isRequired: false },
      { name: 'Connectivity', valueType: 'select', options: ['GPS', 'GPS + Cellular', 'Bluetooth Only', 'LTE'], isRequired: false },
      { name: 'Battery Life', valueType: 'select', options: ['12 hours', '18 hours', '24 hours', '36 hours', '2 days', '3-5 days', '1 week', '2 weeks', '1 month'], isRequired: false },
      { name: 'Water Resistance', valueType: 'select', options: ['IP67', 'IP68', '5ATM (50m)', '10ATM (100m)', 'No'], isRequired: false },
      { name: 'Health Features', valueType: 'select', options: ['Heart Rate Monitor', 'ECG', 'Blood Oxygen', 'Sleep Tracking', 'Stress Monitoring', 'All Features'], isRequired: false },
      { name: 'GPS', valueType: 'select', options: ['Yes', 'No', 'GPS + GLONASS', 'Dual-Band GPS'], isRequired: false },
      { name: 'Storage', valueType: 'select', options: ['4GB', '8GB', '16GB', '32GB', '64GB', 'No Storage'], isRequired: false },
      { name: 'NFC/Payment', valueType: 'select', options: ['Yes', 'No', 'Apple Pay', 'Google Pay', 'Samsung Pay'], isRequired: false },
      { name: 'Voice Assistant', valueType: 'select', options: ['Siri', 'Google Assistant', 'Alexa', 'Bixby', 'No'], isRequired: false },
      { name: 'Band Material', valueType: 'select', options: ['Silicone', 'Leather', 'Stainless Steel', 'Nylon', 'Sport Band', 'Metal Link', 'Fabric'], isRequired: false },
      { name: 'Case Material', valueType: 'select', options: ['Aluminum', 'Stainless Steel', 'Titanium', 'Ceramic', 'Plastic'], isRequired: false },
      { name: 'Color', valueType: 'select', options: getWatchColorOptions(context.brand), isRequired: false },
      { name: 'Touchscreen', valueType: 'select', options: ['Yes', 'No', 'Force Touch'], isRequired: false },
      { name: 'Microphone', valueType: 'select', options: ['Yes', 'No'], isRequired: false },
      { name: 'Speaker', valueType: 'select', options: ['Yes', 'No'], isRequired: false },
      { name: 'Wireless Charging', valueType: 'select', options: ['Yes', 'No'], isRequired: false },
      { name: 'Warranty', valueType: 'select', options: ['No Warranty', '3 Months', '6 Months', '1 Year', '2 Years', 'Extended Warranty'], isRequired: false }
    )
  } 
  else {
    // Generic specifications for unknown categories
    specifications.push(
      { name: 'Brand', valueType: 'select', options: ['Apple', 'Samsung', 'Dell', 'HP', 'Lenovo', 'Other'], isRequired: true },
      { name: 'Model', valueType: 'select', options: ['Latest Model', 'Previous Generation', 'Older Model'], isRequired: false },
      { name: 'Color', valueType: 'select', options: ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green'], isRequired: false },
      { name: 'Condition', valueType: 'select', options: ['Brand New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'], isRequired: true },
      { name: 'Warranty', valueType: 'select', options: ['No Warranty', '3 Months', '6 Months', '1 Year', '2 Years', '3 Years'], isRequired: false }
    )
  }

  return specifications
}

// Helper functions for brand-specific options
function getProcessorOptions(brand: string | null): string[] {
  if (!brand) {
    return ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'Apple M1', 'Apple M2', 'Apple M3', 'Apple M4']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple') || brandLower.includes('mac')) {
    return ['Apple M1', 'Apple M1 Pro', 'Apple M1 Max', 'Apple M1 Ultra', 'Apple M2', 'Apple M2 Pro', 'Apple M2 Max', 'Apple M2 Ultra', 'Apple M3', 'Apple M3 Pro', 'Apple M3 Max', 'Apple M4']
  } else if (brandLower.includes('dell') || brandLower.includes('hp') || brandLower.includes('lenovo') || brandLower.includes('asus')) {
    return ['Intel Core i3 (11th Gen)', 'Intel Core i5 (11th Gen)', 'Intel Core i5 (12th Gen)', 'Intel Core i5 (13th Gen)', 'Intel Core i7 (11th Gen)', 'Intel Core i7 (12th Gen)', 'Intel Core i7 (13th Gen)', 'Intel Core i9 (12th Gen)', 'Intel Core i9 (13th Gen)', 'AMD Ryzen 5 5000', 'AMD Ryzen 7 5000', 'AMD Ryzen 5 6000', 'AMD Ryzen 7 6000', 'AMD Ryzen 9 6000']
  }
  
  return ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9']
}

function getMobileProcessorOptions(brand: string | null): string[] {
  if (!brand) {
    return ['Snapdragon 6 Gen 1', 'Snapdragon 7 Gen 1', 'Snapdragon 8 Gen 1', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3', 'MediaTek Dimensity 7200', 'MediaTek Dimensity 8200', 'MediaTek Dimensity 9000', 'MediaTek Dimensity 9200', 'Apple A15 Bionic', 'Apple A16 Bionic', 'Apple A17 Pro', 'Apple A18']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple') || brandLower.includes('iphone')) {
    return ['Apple A13 Bionic', 'Apple A14 Bionic', 'Apple A15 Bionic', 'Apple A16 Bionic', 'Apple A17 Pro', 'Apple A18', 'Apple A18 Pro']
  } else if (brandLower.includes('samsung')) {
    return ['Snapdragon 778G', 'Snapdragon 8 Gen 1', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3', 'Exynos 1380', 'Exynos 2200', 'Exynos 2400']
  } else if (brandLower.includes('xiaomi') || brandLower.includes('redmi') || brandLower.includes('poco')) {
    return ['Snapdragon 695', 'Snapdragon 778G', 'Snapdragon 870', 'Snapdragon 8 Gen 1', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3', 'MediaTek Dimensity 7200', 'MediaTek Dimensity 8200', 'MediaTek Dimensity 9200']
  } else if (brandLower.includes('oneplus')) {
    return ['Snapdragon 778G', 'Snapdragon 8 Gen 1', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3', 'MediaTek Dimensity 9000']
  } else if (brandLower.includes('oppo') || brandLower.includes('realme') || brandLower.includes('vivo')) {
    return ['Snapdragon 695', 'Snapdragon 778G', 'Snapdragon 8 Gen 1', 'Snapdragon 8 Gen 2', 'MediaTek Dimensity 7200', 'MediaTek Dimensity 8200', 'MediaTek Dimensity 9000']
  }
  
  return ['Snapdragon 6 Gen 1', 'Snapdragon 7 Gen 1', 'Snapdragon 8 Gen 2', 'Snapdragon 8 Gen 3', 'MediaTek Dimensity 9200']
}

function getTabletProcessorOptions(brand: string | null): string[] {
  if (!brand) {
    return ['Apple M1', 'Apple M2', 'Apple M4', 'Snapdragon 7 Gen 2', 'Snapdragon 8 Gen 2', 'Snapdragon 8cx Gen 3', 'MediaTek Helio G99', 'MediaTek Dimensity 9000']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple') || brandLower.includes('ipad')) {
    return ['Apple A14 Bionic', 'Apple A15 Bionic', 'Apple A17 Pro', 'Apple M1', 'Apple M2', 'Apple M4']
  } else if (brandLower.includes('samsung')) {
    return ['Snapdragon 778G', 'Snapdragon 8 Gen 1', 'Snapdragon 8 Gen 2', 'Snapdragon 8cx Gen 3', 'Exynos 1380']
  }
  
  return ['Snapdragon 7 Gen 2', 'Snapdragon 8 Gen 2', 'MediaTek Helio G99', 'MediaTek Dimensity 9000']
}

function getOSOptions(brand: string | null): string[] {
  if (!brand) {
    return ['Windows 10', 'Windows 11', 'macOS Sonoma', 'macOS Ventura', 'macOS Monterey', 'Linux', 'Chrome OS']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple') || brandLower.includes('mac')) {
    return ['macOS Sequoia', 'macOS Sonoma', 'macOS Ventura', 'macOS Monterey', 'macOS Big Sur']
  } else if (brandLower.includes('chromebook')) {
    return ['Chrome OS']
  }
  
  return ['Windows 10', 'Windows 11', 'Linux', 'Chrome OS', 'DOS']
}

function getMobileOSOptions(brand: string | null): string[] {
  if (!brand) {
    return ['Android 12', 'Android 13', 'Android 14', 'Android 15', 'iOS 16', 'iOS 17', 'iOS 18']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple') || brandLower.includes('iphone')) {
    return ['iOS 15', 'iOS 16', 'iOS 17', 'iOS 18']
  }
  
  return ['Android 11', 'Android 12', 'Android 13', 'Android 14', 'Android 15']
}

function getTabletOSOptions(brand: string | null): string[] {
  if (!brand) {
    return ['Android 12', 'Android 13', 'Android 14', 'iPadOS 16', 'iPadOS 17', 'iPadOS 18', 'Windows 11']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple') || brandLower.includes('ipad')) {
    return ['iPadOS 15', 'iPadOS 16', 'iPadOS 17', 'iPadOS 18']
  } else if (brandLower.includes('surface')) {
    return ['Windows 10', 'Windows 11']
  }
  
  return ['Android 11', 'Android 12', 'Android 13', 'Android 14', 'HarmonyOS']
}

function getWatchOSOptions(brand: string | null): string[] {
  if (!brand) {
    return ['watchOS', 'Wear OS', 'Tizen', 'Proprietary OS', 'HarmonyOS']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple')) {
    return ['watchOS 9', 'watchOS 10', 'watchOS 11']
  } else if (brandLower.includes('samsung')) {
    return ['Wear OS', 'One UI Watch', 'Tizen']
  } else if (brandLower.includes('google') || brandLower.includes('pixel')) {
    return ['Wear OS 3', 'Wear OS 4']
  } else if (brandLower.includes('huawei')) {
    return ['HarmonyOS', 'LiteOS']
  }
  
  return ['Wear OS', 'Proprietary OS']
}

function getGraphicsCardOptions(brand: string | null): string[] {
  if (!brand) {
    return ['Integrated Graphics', 'NVIDIA GeForce MX450', 'NVIDIA GeForce MX550', 'NVIDIA GeForce RTX 3050', 'NVIDIA GeForce RTX 3060', 'NVIDIA GeForce RTX 4050', 'NVIDIA GeForce RTX 4060', 'NVIDIA GeForce RTX 4070', 'NVIDIA GeForce RTX 4080', 'AMD Radeon RX 6500M', 'AMD Radeon RX 6600M', 'AMD Radeon RX 7600M']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple') || brandLower.includes('mac')) {
    return ['Apple M1 (7-core GPU)', 'Apple M1 (8-core GPU)', 'Apple M1 Pro (14-core GPU)', 'Apple M1 Pro (16-core GPU)', 'Apple M1 Max (24-core GPU)', 'Apple M1 Max (32-core GPU)', 'Apple M2 (8-core GPU)', 'Apple M2 (10-core GPU)', 'Apple M2 Pro', 'Apple M2 Max', 'Apple M3', 'Apple M3 Pro', 'Apple M3 Max', 'Apple M4']
  }
  
  return ['Integrated Graphics', 'Intel Iris Xe', 'NVIDIA GeForce MX450', 'NVIDIA GeForce MX550', 'NVIDIA GeForce RTX 3050', 'NVIDIA GeForce RTX 3060', 'NVIDIA GeForce RTX 4050', 'NVIDIA GeForce RTX 4060', 'NVIDIA GeForce RTX 4070', 'AMD Radeon RX 6600M', 'AMD Radeon RX 7600M']
}

function getColorOptions(brand: string | null): string[] {
  if (!brand) {
    return ['Black', 'White', 'Silver', 'Gray', 'Space Gray', 'Blue', 'Gold', 'Rose Gold', 'Green', 'Purple', 'Pink', 'Red']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple') || brandLower.includes('mac')) {
    return ['Space Gray', 'Silver', 'Gold', 'Midnight', 'Starlight', 'Space Black']
  } else if (brandLower.includes('dell')) {
    return ['Platinum Silver', 'Black', 'Gray', 'Blue']
  } else if (brandLower.includes('hp')) {
    return ['Natural Silver', 'Black', 'Silver', 'Blue', 'Gold']
  } else if (brandLower.includes('lenovo')) {
    return ['Iron Gray', 'Platinum Gray', 'Black', 'Silver']
  } else if (brandLower.includes('asus')) {
    return ['Black', 'Silver', 'White', 'Gray', 'Blue', 'Red']
  }
  
  return ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green']
}

function getMobileColorOptions(brand: string | null): string[] {
  if (!brand) {
    return ['Black', 'White', 'Silver', 'Blue', 'Green', 'Purple', 'Pink', 'Red', 'Yellow', 'Coral', 'Gold', 'Titanium']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple') || brandLower.includes('iphone')) {
    return ['Black', 'White', 'Midnight', 'Starlight', 'Product Red', 'Blue', 'Purple', 'Green', 'Yellow', 'Pink', 'Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium']
  } else if (brandLower.includes('samsung')) {
    return ['Phantom Black', 'Phantom White', 'Phantom Gray', 'Phantom Silver', 'Phantom Violet', 'Phantom Pink', 'Cream', 'Graphite', 'Lavender', 'Green', 'Blue']
  } else if (brandLower.includes('xiaomi') || brandLower.includes('redmi') || brandLower.includes('poco')) {
    return ['Midnight Black', 'Moonlight White', 'Phantom Blue', 'Frost Blue', 'Polar White', 'Racing Yellow', 'Graphite Gray', 'Aurora Green']
  } else if (brandLower.includes('oneplus')) {
    return ['Midnight Black', 'Glacial Silver', 'Marble Odyssey', 'Eternal Green', 'Volcanic Red']
  } else if (brandLower.includes('oppo') || brandLower.includes('realme') || brandLower.includes('vivo')) {
    return ['Glowing Black', 'Starry White', 'Sunset Orange', 'Aurora Blue', 'Emerald Green', 'Cosmic Purple']
  } else if (brandLower.includes('google') || brandLower.includes('pixel')) {
    return ['Obsidian', 'Snow', 'Hazel', 'Stormy Black', 'Clearly White', 'Sorta Sage', 'Kinda Coral']
  }
  
  return ['Black', 'White', 'Blue', 'Green', 'Purple', 'Pink', 'Red', 'Silver']
}

function getWatchColorOptions(brand: string | null): string[] {
  if (!brand) {
    return ['Black', 'White', 'Silver', 'Gold', 'Rose Gold', 'Space Gray', 'Blue', 'Green', 'Red', 'Pink']
  }
  
  const brandLower = brand.toLowerCase()
  if (brandLower.includes('apple')) {
    return ['Midnight', 'Starlight', 'Silver', 'Gold', 'Graphite', 'Space Black', 'Product Red', 'Blue', 'Green', 'Pink', 'Yellow', 'Orange']
  } else if (brandLower.includes('samsung')) {
    return ['Black', 'Silver', 'Gold', 'Pink Gold', 'Green', 'Blue', 'Gray']
  } else if (brandLower.includes('garmin')) {
    return ['Black', 'White', 'Silver', 'Slate Gray', 'Aqua', 'Rose Gold']
  } else if (brandLower.includes('fitbit')) {
    return ['Black', 'White', 'Silver', 'Gold', 'Blue', 'Pink', 'Purple']
  }
  
  return ['Black', 'Silver', 'White', 'Gold', 'Rose Gold', 'Blue']
}

function generateDefaultOptions(specName: string, categoryName: string, brandName: string | null): string[] {
  const nameLower = specName.toLowerCase()
  
  if (nameLower.includes('ram')) {
    return ['8GB', '16GB', '32GB']
  } else if (nameLower.includes('storage')) {
    return ['128GB', '256GB', '512GB', '1TB']
  } else if (nameLower.includes('processor')) {
    return getProcessorOptions(brandName)
  } else if (nameLower.includes('color')) {
    return getColorOptions(brandName)
  } else if (nameLower.includes('condition')) {
    return ['Brand New', 'Like New', 'Excellent', 'Good', 'Fair']
  }
  
  // Generic fallback
  return ['Option 1', 'Option 2', 'Option 3', 'Option 4']
}
