// src/lib/otp.ts

import { prisma } from '@/lib/db'

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function createOTP(
  identifier: string,
  type: 'email' | 'phone',
  otpType: 'signup' | 'login' | 'reset'
): Promise<string> {
  const code = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Delete any existing unverified OTPs for this identifier
  if (type === 'email') {
    await prisma.oTP.deleteMany({
      where: {
        email: identifier,
        verified: false,
      },
    })
  } else {
    await prisma.oTP.deleteMany({
      where: {
        phone: identifier,
        verified: false,
      },
    })
  }

  // Create new OTP
  await prisma.oTP.create({
    data: {
      [type]: identifier,
      code,
      type: otpType,
      expiresAt,
    },
  })

  return code
}

export async function verifyOTP(
  identifier: string,
  code: string,
  type: 'email' | 'phone'
): Promise<{ valid: boolean; error?: string }> {
  const otp = await prisma.oTP.findFirst({
    where: {
      [type]: identifier,
      code,
      verified: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!otp) {
    return { valid: false, error: 'Invalid OTP code' }
  }

  if (new Date() > otp.expiresAt) {
    return { valid: false, error: 'OTP has expired' }
  }

  // Mark OTP as verified
  await prisma.oTP.update({
    where: { id: otp.id },
    data: { verified: true },
  })

  return { valid: true }
}

export async function sendOTPEmail(email: string, code: string): Promise<void> {
  // TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
  console.log(`Sending OTP ${code} to email: ${email}`)
  
  // Example with nodemailer (you'll need to install it):
  // const transporter = nodemailer.createTransport({ ... })
  // await transporter.sendMail({
  //   from: 'noreply@sellfast.com',
  //   to: email,
  //   subject: 'Your OTP Code',
  //   html: `Your verification code is: <strong>${code}</strong>`
  // })
}

export async function sendOTPSMS(phone: string, code: string): Promise<void> {
  // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
  console.log(`Sending OTP ${code} to phone: ${phone}`)
  
  // Example with Twilio:
  // const client = twilio(accountSid, authToken)
  // await client.messages.create({
  //   body: `Your SellFast verification code is: ${code}`,
  //   from: '+1234567890',
  //   to: phone
  // })
}