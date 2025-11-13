import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Check MongoDB Atlas database connection
 */
async function checkMongoConnection(): Promise<boolean> {
  try {
    console.log('🔌 Checking MongoDB Atlas connection...');

    // Test connection
    await prisma.$connect();
    console.log('✅ Successfully connected to MongoDB Atlas\n');

    // Test a simple query
    const userCount = await prisma.user.count();
    const categoryCount = await prisma.itemCategory.count();
    const companyCount = await prisma.company.count();
    const itemCount = await prisma.item.count();

    console.log('📊 Current Database Stats:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Companies: ${companyCount}`);
    console.log(`   Items: ${itemCount}\n`);

    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB Atlas:');
    console.error(error);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check your DATABASE_URL in .env.local file');
    console.error('   2. Verify your MongoDB Atlas cluster is running');
    console.error('   3. Ensure your IP is whitelisted in MongoDB Atlas');
    console.error('   4. Check your connection string format: mongodb+srv://user:password@cluster.mongodb.net/database\n');
    return false;
  }
}

/**
 * 🌱 Seed Database
 */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 SellFast Database Seeder\n');
  console.log('='.repeat(50) + '\n');

  try {
    // Check MongoDB connection first
    const isConnected = await checkMongoConnection();
    if (!isConnected) {
      console.error('❌ Cannot proceed without database connection. Exiting...');
      process.exit(1);
    }

    console.log('='.repeat(50));
    console.log('Starting seed process...\n');

    /* -------------------------------------------------------------------------- */
    /* 🧩 1. Create Admin User                                                   */
    /* -------------------------------------------------------------------------- */
    console.log('👤 Creating admin user...');
    const adminEmail = 'admin@sellfast.com';
    const adminPassword = 'admin123@';

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await hashPassword(adminPassword);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin',
          role: 'ADMIN',
          isActive: true,
          provider: 'credentials',
          emailVerified: true,
          phoneVerified: false,
        },
      });
      console.log(`✅ Admin user created: ${adminEmail} / ${adminPassword}`);
    } else {
      const hashedPassword = await hashPassword(adminPassword);
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
          emailVerified: true,
        },
      });
      console.log(`✅ Admin user updated: ${adminEmail} / ${adminPassword}`);
    }

    console.log('\n🎉 Seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    console.log('🔌 Disconnecting from database...');
    await prisma.$disconnect();
    console.log('✅ Disconnected successfully\n');
  }
}

// Run the seeder directly
seedDatabase();
