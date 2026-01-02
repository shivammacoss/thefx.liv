import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Check if super admin exists
    const existingSuperAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    
    if (existingSuperAdmin) {
      console.log('Super Admin already exists!');
      console.log('Email:', existingSuperAdmin.email);
      console.log('Password: admin123');
    } else {
      // Create Super Admin
      const superAdmin = await Admin.create({
        role: 'SUPER_ADMIN',
        username: 'superadmin',
        name: 'Super Administrator',
        email: 'superadmin@ntrader.com',
        phone: '9999999999',
        password: 'admin123',
        pin: '1234',
        wallet: { balance: 10000000 } // 1 Crore initial balance
      });
      
      console.log('Super Admin Created Successfully!');
      console.log('================================');
      console.log('Email: superadmin@ntrader.com');
      console.log('Password: admin123');
      console.log('Role: SUPER_ADMIN');
      console.log('================================');
    }

    // Create a sample Admin if not exists
    const existingAdmin = await Admin.findOne({ role: 'ADMIN' });
    
    if (!existingAdmin) {
      const admin = await Admin.create({
        role: 'ADMIN',
        username: 'demoadmin',
        name: 'Demo Admin',
        email: 'admin@ntrader.com',
        phone: '9876543210',
        password: 'admin123',
        pin: '1234',
        wallet: { balance: 100000 }, // 1 Lakh initial balance
        createdBy: (await Admin.findOne({ role: 'SUPER_ADMIN' }))?._id
      });
      
      console.log('\nDemo Admin Created Successfully!');
      console.log('================================');
      console.log('Email: admin@ntrader.com');
      console.log('Password: admin123');
      console.log('Admin Code:', admin.adminCode);
      console.log('Role: ADMIN');
      console.log('================================');
    } else {
      console.log('\nDemo Admin already exists!');
      console.log('Admin Code:', existingAdmin.adminCode);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
