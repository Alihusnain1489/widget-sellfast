import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/middleware'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const categoryId = formData.get('categoryId') as string
    const categoryName = formData.get('categoryName') as string
    const itemName = formData.get('itemName') as string
    const autoCreate = formData.get('autoCreate') === 'true' // Flag to auto-create specs

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // Convert file to base64 or text
    let fileContent = ''
    const fileType = file.type

    if (fileType.startsWith('text/') || fileType === 'application/json') {
      fileContent = await file.text()
    } else if (fileType === 'application/pdf') {
      // For PDF, we'll need to extract text (this is a simplified version)
      // In production, use a PDF parsing library
      fileContent = `[PDF File: ${file.name}] - PDF text extraction requires additional library`
    } else if (fileType.startsWith('image/')) {
      // For images, convert to base64
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      fileContent = buffer.toString('base64')
    } else {
      fileContent = await file.text()
    }

    // Call AI service to analyze document
    const analysisResult = await analyzeDocumentWithAI(fileContent, fileType, {
      categoryName,
      itemName
    })

    // Auto-create specifications if requested
    let createdSpecs = []
    if (autoCreate && analysisResult.specifications && analysisResult.specifications.length > 0) {
      createdSpecs = await autoCreateSpecifications(categoryId, analysisResult.specifications)
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      fileName: file.name,
      fileType: fileType,
      createdSpecs: createdSpecs.length,
      specifications: createdSpecs
    })
  } catch (error: any) {
    console.error('Error analyzing document:', error)
    return NextResponse.json(
      { error: 'Failed to analyze document', details: error.message },
      { status: 500 }
    )
  }
}

async function analyzeDocumentWithAI(
  content: string,
  fileType: string,
  context: { categoryName?: string; itemName?: string }
) {
  // Enhanced text parsing to extract all specifications with their exact values from text
  
  // Try to extract product name from content
  let extractedProductName = context.itemName || 'Extracted Product'
  const productNamePatterns = [
    /(?:product|model|name|item|title)[\s:]+([^\n,]+)/i,
    /^([A-Z][A-Za-z0-9\s]+?)(?:\s*[-–—]\s*|$)/m,
    /([A-Z][A-Za-z0-9\s]+?)\s*(?:specifications|features|details)/i
  ]
  
  for (const pattern of productNamePatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      extractedProductName = match[1].trim()
      break
    }
  }
  
  const specifications: Array<{
    name: string
    valueType: string
    options: string[]
  }> = []
  
  const contentLower = content.toLowerCase()
  const lines = content.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
  
  // Enhanced extraction patterns for common specifications
  const specPatterns = [
    // RAM patterns
    {
      name: 'RAM',
      patterns: [
        /ram[\s:]+([0-9]+\s*(?:gb|mb))/gi,
        /memory[\s:]+([0-9]+\s*(?:gb|mb))/gi,
        /([0-9]+\s*(?:gb|mb))\s+ram/gi
      ],
      extractValues: (text: string) => {
        const values = new Set<string>()
        const matches = text.matchAll(/([0-9]+\s*(?:gb|mb))/gi)
        for (const match of matches) {
          values.add(match[1].trim())
        }
        return Array.from(values)
      }
    },
    // Storage patterns
    {
      name: 'Storage',
      patterns: [
        /storage[\s:]+([0-9]+\s*(?:gb|tb|mb))/gi,
        /ssd[\s:]+([0-9]+\s*(?:gb|tb))/gi,
        /hdd[\s:]+([0-9]+\s*(?:gb|tb))/gi,
        /([0-9]+\s*(?:gb|tb))\s+storage/gi,
        /([0-9]+\s*(?:gb|tb))\s+ssd/gi
      ],
      extractValues: (text: string) => {
        const values = new Set<string>()
        const matches = text.matchAll(/([0-9]+\s*(?:gb|tb|mb))/gi)
        for (const match of matches) {
          values.add(match[1].trim())
        }
        return Array.from(values)
      }
    },
    // Processor patterns
    {
        name: 'Processor',
      patterns: [
        /processor[\s:]+([^\n,]+)/gi,
        /cpu[\s:]+([^\n,]+)/gi,
        /chip[\s:]+([^\n,]+)/gi,
        /(intel|amd|apple|snapdragon|mediatek|exynos)[^\n,]*/gi
      ],
      extractValues: (text: string) => {
        const values = new Set<string>()
        // Extract processor mentions
        const processorMatches = text.matchAll(/(?:processor|cpu|chip)[\s:]+([^\n,]+)/gi)
        for (const match of processorMatches) {
          const value = match[1].trim()
          if (value && value.length < 50) {
            values.add(value)
          }
        }
        // Also extract brand-specific processors
        const brandMatches = text.matchAll(/(intel\s+(?:core|celeron|pentium)[^\n,]*|amd\s+(?:ryzen|athlon|fx)[^\n,]*|apple\s+(?:m[0-9]|a[0-9]+)[^\n,]*|snapdragon\s+[0-9]+[^\n,]*|mediatek\s+[^\n,]*|exynos\s+[0-9]+[^\n,]*)/gi)
        for (const match of brandMatches) {
          const value = match[0].trim()
          if (value && value.length < 50) {
            values.add(value)
          }
        }
        return Array.from(values)
      }
    },
    // Screen Size patterns
    {
      name: 'Screen Size',
      patterns: [
        /screen[\s:]+([0-9.]+["\s]*inches?)/gi,
        /display[\s:]+([0-9.]+["\s]*inches?)/gi,
        /([0-9.]+["\s]*inches?)\s+screen/gi,
        /([0-9.]+["\s]*inches?)\s+display/gi
      ],
      extractValues: (text: string) => {
        const values = new Set<string>()
        const matches = text.matchAll(/([0-9.]+["\s]*inches?)/gi)
        for (const match of matches) {
          values.add(match[1].trim())
        }
        return Array.from(values)
  }
    },
    // Color patterns
    {
      name: 'Color',
      patterns: [
        /color[s]?[\s:]+([^\n,]+)/gi,
        /colour[s]?[\s:]+([^\n,]+)/gi,
        /available[\s]+(?:in|colors?)[\s:]+([^\n,]+)/gi
      ],
      extractValues: (text: string) => {
        const values = new Set<string>()
        const colorMatches = text.matchAll(/(?:color|colour)[s]?[\s:]+([^\n,]+)/gi)
        for (const match of colorMatches) {
          const colors = match[1].split(/[,;&|]/).map(c => c.trim()).filter(c => c.length > 0 && c.length < 30)
          colors.forEach(c => values.add(c))
        }
        return Array.from(values)
      }
    },
    // Operating System patterns
    {
      name: 'Operating System',
      patterns: [
        /os[\s:]+([^\n,]+)/gi,
        /operating\s+system[\s:]+([^\n,]+)/gi,
        /(windows|macos|linux|android|ios|ipados|watchos)[^\n,]*/gi
      ],
      extractValues: (text: string) => {
        const values = new Set<string>()
        const osMatches = text.matchAll(/(?:os|operating\s+system)[\s:]+([^\n,]+)/gi)
        for (const match of osMatches) {
          const value = match[1].trim()
          if (value && value.length < 30) {
            values.add(value)
          }
        }
        const brandMatches = text.matchAll(/(windows\s+[0-9]+|macos|linux|android\s+[0-9]+|ios\s+[0-9]+|ipados\s+[0-9]+|watchos\s+[0-9]+)/gi)
        for (const match of brandMatches) {
          values.add(match[0].trim())
        }
        return Array.from(values)
      }
    },
    // Battery patterns
    {
      name: 'Battery',
      patterns: [
        /battery[\s:]+([0-9]+\s*(?:mah|mAh|hours?))/gi,
        /([0-9]+\s*(?:mah|mAh))\s+battery/gi,
        /battery\s+life[\s:]+([0-9]+\s*hours?)/gi
      ],
      extractValues: (text: string) => {
        const values = new Set<string>()
        const matches = text.matchAll(/([0-9]+\s*(?:mah|mAh|hours?))/gi)
        for (const match of matches) {
          values.add(match[1].trim())
        }
        return Array.from(values)
  }
    },
    // Weight patterns
    {
      name: 'Weight',
      patterns: [
        /weight[\s:]+([0-9.]+\s*(?:kg|g|lbs?|pounds?))/gi,
        /([0-9.]+\s*(?:kg|g|lbs?|pounds?))\s+weight/gi
      ],
      extractValues: (text: string) => {
        const values = new Set<string>()
        const matches = text.matchAll(/([0-9.]+\s*(?:kg|g|lbs?|pounds?))/gi)
        for (const match of matches) {
          values.add(match[1].trim())
        }
        return Array.from(values)
      }
    },
    // Camera patterns
    {
      name: 'Camera',
      patterns: [
        /camera[\s:]+([0-9]+\s*(?:mp|megapixel))/gi,
        /([0-9]+\s*(?:mp|megapixel))\s+camera/gi,
        /rear\s+camera[\s:]+([0-9]+\s*(?:mp|megapixel))/gi,
        /main\s+camera[\s:]+([0-9]+\s*(?:mp|megapixel))/gi
      ],
      extractValues: (text: string) => {
        const values = new Set<string>()
        const matches = text.matchAll(/([0-9]+\s*(?:mp|megapixel))/gi)
        for (const match of matches) {
          values.add(match[1].trim())
        }
        return Array.from(values)
      }
    },
    // Condition patterns
    {
      name: 'Condition',
      patterns: [
        /condition[\s:]+([^\n,]+)/gi,
        /(brand\s+new|like\s+new|excellent|good|fair|poor|used|refurbished)/gi
      ],
      extractValues: (text: string) => {
        const values = new Set<string>()
        const conditionMatches = text.matchAll(/(?:condition)[\s:]+([^\n,]+)/gi)
        for (const match of conditionMatches) {
          const conditions = match[1].split(/[,;&|]/).map(c => c.trim()).filter(c => c.length > 0)
          conditions.forEach(c => values.add(c))
        }
        const predefined = text.matchAll(/(brand\s+new|like\s+new|excellent|good|fair|poor|used|refurbished|open\s+box)/gi)
        for (const match of predefined) {
          values.add(match[0].trim())
        }
        return Array.from(values)
      }
    }
  ]
  
  // Extract specifications from text
  for (const specPattern of specPatterns) {
    let found = false
    let extractedOptions: string[] = []
    
    // Check if specification is mentioned in text
    for (const pattern of specPattern.patterns) {
      if (pattern.test(content)) {
        found = true
        break
      }
    }
    
    if (found) {
      // Extract actual values from text
      extractedOptions = specPattern.extractValues(content)
      
      // If we found values, use them; otherwise use empty array (will be filled with defaults)
      if (extractedOptions.length > 0) {
        specifications.push({
          name: specPattern.name,
          valueType: 'select',
          options: extractedOptions.slice(0, 20) // Limit to 20 options
        })
      } else {
        // Still add the spec but with empty options (will be filled later)
        specifications.push({
          name: specPattern.name,
          valueType: 'select',
          options: []
        })
      }
    }
  }
  
  // Extract any other specifications mentioned in key-value format
  const keyValuePattern = /([A-Za-z\s]+)[\s:]+([^\n,]+)/g
  const keyValueMatches = content.matchAll(keyValuePattern)
  const seenSpecs = new Set(specifications.map(s => s.name.toLowerCase()))
  
  for (const match of keyValueMatches) {
    const key = match[1].trim()
    const value = match[2].trim()
    
    // Skip if it's a common word or too short
    if (key.length < 3 || key.length > 30 || value.length < 1 || value.length > 100) continue
    
    // Skip common non-specification keys
    const skipKeys = ['product', 'model', 'name', 'item', 'title', 'description', 'price', 'cost', 'the', 'and', 'or', 'with']
    if (skipKeys.includes(key.toLowerCase())) continue
    
    // Check if this looks like a specification
    if (!seenSpecs.has(key.toLowerCase()) && 
        /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(key) && // Proper case format
        value.length < 50) {
      seenSpecs.add(key.toLowerCase())
      specifications.push({
        name: key,
        valueType: 'select',
        options: [value]
      })
    }
  }
  
  // If no specs found, return empty array (don't add defaults)
  return {
    productName: extractedProductName,
    specifications,
    confidence: specifications.length > 0 ? 0.85 : 0.3,
    extractedText: content.substring(0, 1000)
  }
}

// Auto-create specifications in database
async function autoCreateSpecifications(
  categoryId: string,
  specifications: Array<{ name: string; valueType: string; options: string[] }>
): Promise<any[]> {
  try {
    // Get existing specifications
    const existingSpecs = await prisma.categorySpecification.findMany({
      where: { categoryId },
      orderBy: { order: 'asc' }
    })
    
    const existingSpecNames = new Set(existingSpecs.map(s => s.name.toLowerCase()))
    const createdSpecs = []
    let orderCounter = existingSpecs.length > 0 
      ? Math.max(...existingSpecs.map(s => s.order || 0)) + 1 
      : 1
    
    for (const spec of specifications) {
      // Skip if already exists
      if (existingSpecNames.has(spec.name.toLowerCase())) {
        continue
      }
      
      try {
        // Ensure options array has at least 2 items
        let optionsArray = Array.isArray(spec.options) ? spec.options : []
        if (optionsArray.length === 0) {
          // Add a default option if none found
          optionsArray = ['As specified in text']
        } else if (optionsArray.length === 1) {
          // Duplicate the single option to have at least 2
          optionsArray.push(optionsArray[0])
        }
        
        const created = await prisma.categorySpecification.create({
          data: {
            categoryId,
            name: spec.name,
            valueType: 'select', // Always select
            options: JSON.stringify(optionsArray),
            icon: null,
            order: orderCounter++,
            isRequired: false
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
          console.error(`Failed to create spec: ${spec.name}`, error.message)
        }
      }
    }
    
    return createdSpecs
  } catch (error: any) {
    console.error('Error auto-creating specifications:', error)
    return []
  }
}

