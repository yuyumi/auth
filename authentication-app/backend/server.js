const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
const MONGODB_URL = process.env.MONGODB_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userId: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now }
});

// Product Schema
const productSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    ownerId: { type: String, required: true },
    transactionDate: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

// Generate unique user ID
function generateUserId() {
    return crypto.randomBytes(16).toString('hex');
}

// Register user
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate unique user ID
        const userId = generateUserId();

        // Create new user
        const user = new User({
            email,
            password: hashedPassword,
            userId
        });

        await user.save();
        res.status(201).json({ message: 'User created successfully', userId });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.userId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, userId: user.userId });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Add product
app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.body;
        const ownerId = req.user.userId;

        const product = new Product({
            productId,
            ownerId,
            transactionDate: new Date()
        });

        await product.save();
        res.status(201).json({ message: 'Product added successfully', product });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product', error: error.message });
    }
});

// Get user's products
app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        const products = await Product.find({ ownerId: req.user.userId });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
});

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});