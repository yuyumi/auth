require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/authentication_app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your.admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Change this!

// User Schema (copy from your server.js)
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userId: { type: String, unique: true },
    accountType: { 
        type: String, 
        enum: ['admin', 'manufacturer', 'user'],
        required: true
    },
    isVerified: {
        type: Boolean,
        default: true
    },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Generate unique user ID
function generateUserId() {
    return 'admin_' + crypto.randomBytes(8).toString('hex');
}

async function createAdminUser() {
    try {
        await mongoose.connect(MONGODB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
        if (existingAdmin) {
            console.log('Admin account already exists');
            await mongoose.connection.close();
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

        // Create admin user
        const adminUser = new User({
            email: ADMIN_EMAIL,
            password: hashedPassword,
            userId: generateUserId(),
            accountType: 'admin',
            isVerified: true
        });

        await adminUser.save();
        console.log('Admin account created successfully');
        console.log('Admin User ID:', adminUser.userId);
        console.log('Admin Email:', ADMIN_EMAIL);
        
    } catch (error) {
        console.error('Error creating admin account:', error);
    } finally {
        await mongoose.connection.close();
    }
}

createAdminUser();