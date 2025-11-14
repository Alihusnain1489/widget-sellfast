import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const user = getUser(request)

    const contactForm = await prisma.contactForm.create({
      data: {
        name,
        email,
        subject,
        message,
        userId: user?.userId
      }
    })

    return NextResponse.json({ contactForm }, { status: 201 })
  } catch (error) {
    console.error('Error creating contact form:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

