const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { sendManufacturerVerificationEmail } = require('./email_service');

const app = express();
app.use(express.json());
// CORS configuration
app.use(cors({
    origin: '*', // During testing, allow all origins
    methods: ['GET', 'POST'],
    credentials: true
}));

// MongoDB Atlas connection
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/authentication_app?retryWrites=true&w=majority';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: 'majority'
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// Updated User Schema with verification status
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userId: { type: String, unique: true },
    accountType: { 
        type: String, 
        enum: ['admin', 'manufacturer', 'user'],
        required: true,
        default: 'user'
    },
    isVerified: {
        type: Boolean,
        default: function() {
            return this.accountType !== 'manufacturer';
        }
    },
    createdAt: { type: Date, default: Date.now }
});

// Middleware to check admin privileges
const checkAdmin = async (req, res, next) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });
        if (!user || user.accountType !== 'admin') {
            return res.status(403).json({ 
                message: 'Admin privileges required' 
            });
        }
        next();
    } catch (error) {
        res.status(500).json({ 
            message: 'Error checking admin privileges', 
            error: error.message 
        });
    }
};

// Middleware to check if user is a manufacturer
const checkManufacturer = async (req, res, next) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.accountType !== 'manufacturer') {
            return res.status(403).json({ 
                message: 'Only manufacturer accounts can perform this action' 
            });
        }
        next();
    } catch (error) {
        res.status(500).json({ 
            message: 'Error checking user permissions', 
            error: error.message 
        });
    }
};

// Product Schema
const productSchema = new mongoose.Schema({
    itemId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    productId: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
    transactionId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    itemId: { 
        type: String, 
        required: true 
    },
    ownerId: { 
        type: String, 
        required: true 
    },
    previousOwnerId: { 
        type: String,
        default: null  // null for initial creation
    },
    transactionDate: { 
        type: Date, 
        default: Date.now 
    }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

// Generate unique user ID
function generateUserId() {
    return crypto.randomBytes(16).toString('hex');
}

// Helper function to generate random IDs
function generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

// Modified register endpoint with manufacturer verification
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, accountType = 'user' } = req.body;
        
        // Validate account type
        if (!['admin', 'manufacturer', 'user'].includes(accountType)) {
            return res.status(400).json({ 
                message: 'Invalid account type' 
            });
        }

        // Prevent regular registration of admin accounts
        if (accountType === 'admin') {
            return res.status(403).json({ 
                message: 'Admin accounts cannot be created through regular registration' 
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = generateUserId();

        const user = new User({
            email,
            password: hashedPassword,
            userId,
            accountType,
            isVerified: accountType !== 'manufacturer'
        });

        await user.save();

        // Send verification email for manufacturer accounts
        if (accountType === 'manufacturer') {
            try {
                await sendManufacturerVerificationEmail(email, userId);
            } catch (error) {
                console.error('Failed to send verification email:', error);
                // Continue with registration even if email fails
            }
        }

        res.status(201).json({ 
            message: accountType === 'manufacturer' 
                ? 'Account created. Awaiting admin verification.' 
                : 'Account created successfully',
            userId,
            accountType 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error creating user', 
            error: error.message 
        });
    }
});

// Modified login endpoint to check verification
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check verification status for manufacturer accounts
        if (user.accountType === 'manufacturer' && !user.isVerified) {
            return res.status(403).json({ 
                message: 'Account pending verification' 
            });
        }

        const token = jwt.sign(
            { 
                userId: user.userId,
                accountType: user.accountType 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            userId: user.userId,
            accountType: user.accountType
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error logging in', 
            error: error.message 
        });
    }
});

// Admin endpoint to verify manufacturer accounts
app.post('/api/admin/verify-manufacturer/:userId', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { approve } = req.body;

        const manufacturer = await User.findOne({ 
            userId, 
            accountType: 'manufacturer' 
        });

        if (!manufacturer) {
            return res.status(404).json({ 
                message: 'Manufacturer account not found' 
            });
        }

        if (approve) {
            manufacturer.isVerified = true;
            await manufacturer.save();
            res.json({ message: 'Manufacturer account verified' });
        } else {
            await User.deleteOne({ userId });
            res.json({ message: 'Manufacturer account rejected' });
        }
    } catch (error) {
        res.status(500).json({ 
            message: 'Error processing verification', 
            error: error.message 
        });
    }
});

// Get pending manufacturer verifications
app.get('/api/admin/pending-manufacturers', authenticateToken, checkAdmin, async (req, res) => {
    try {
      const pendingManufacturers = await User.find({
        accountType: 'manufacturer',
        isVerified: false
      });
      res.json(pendingManufacturers);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching pending manufacturers' });
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

// Modified create product endpoint to require manufacturer account
app.post('/api/products', authenticateToken, checkManufacturer, async (req, res) => {
    try {
        const { productId } = req.body;
        const ownerId = req.user.userId;

        const itemId = generateId('item');
        
        const product = new Product({
            itemId,
            productId
        });

        const transaction = new Transaction({
            transactionId: generateId('txn'),
            itemId,
            ownerId,
            previousOwnerId: null
        });

        await product.save();
        await transaction.save();

        res.status(201).json({ 
            message: 'Product created successfully', 
            product,
            transaction 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error creating product', 
            error: error.message 
        });
    }
});

// Transfer ownership of a product
app.post('/api/products/transfer', authenticateToken, async (req, res) => {
    try {
        const { itemId, newOwnerId } = req.body;
        const currentOwnerId = req.user.userId;

        // Find the most recent transaction for this item
        const lastTransaction = await Transaction.findOne({ 
            itemId 
        }).sort({ transactionDate: -1 });

        if (!lastTransaction) {
            return res.status(404).json({ 
                message: 'Product not found' 
            });
        }

        // Verify current ownership
        if (lastTransaction.ownerId !== currentOwnerId) {
            return res.status(403).json({ 
                message: 'You do not own this product' 
            });
        }

        // Create new transaction
        const transaction = new Transaction({
            transactionId: generateId('txn'),
            itemId,
            ownerId: newOwnerId,
            previousOwnerId: currentOwnerId
        });

        await transaction.save();

        res.json({ 
            message: 'Ownership transferred successfully', 
            transaction 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error transferring ownership', 
            error: error.message 
        });
    }
});

// Admin endpoint to transfer any product
app.post('/api/admin/transfer-product', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { itemId, newOwnerId } = req.body;

        // Verify the new owner exists
        const newOwner = await User.findOne({ userId: newOwnerId });
        if (!newOwner) {
            return res.status(404).json({ 
                message: 'New owner not found' 
            });
        }

        // Find the current owner from the most recent transaction
        const lastTransaction = await Transaction.findOne({ 
            itemId 
        }).sort({ transactionDate: -1 });

        if (!lastTransaction) {
            return res.status(404).json({ 
                message: 'Product not found' 
            });
        }

        // Create new transaction
        const transaction = new Transaction({
            transactionId: generateId('txn'),
            itemId,
            ownerId: newOwnerId,
            previousOwnerId: lastTransaction.ownerId,
            transactionDate: new Date()
        });

        await transaction.save();

        res.json({ 
            message: 'Product transferred successfully', 
            transaction 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error transferring product', 
            error: error.message 
        });
    }
});

// Get product ownership history
app.get('/api/products/:itemId/history', authenticateToken, async (req, res) => {
    try {
        const { itemId } = req.params;

        // Find the product
        const product = await Product.findOne({ itemId });
        if (!product) {
            return res.status(404).json({ 
                message: 'Product not found' 
            });
        }

        // Get all transactions for this item
        const transactions = await Transaction.find({ 
            itemId 
        }).sort({ transactionDate: 1 });

        res.json({
            product,
            transactions
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching product history', 
            error: error.message 
        });
    }
});

// Get products owned by user
app.get('/api/products/owned', authenticateToken, async (req, res) => {
    try {
        const ownerId = req.user.userId;

        // Find the latest transaction for each item owned by the user
        const latestTransactions = await Transaction.aggregate([
            {
                $sort: { 
                    itemId: 1, 
                    transactionDate: -1 
                }
            },
            {
                $group: {
                    _id: '$itemId',
                    lastTransaction: { $first: '$$ROOT' }
                }
            },
            {
                $match: {
                    'lastTransaction.ownerId': ownerId
                }
            }
        ]);

        // Get the product details for each item
        const itemIds = latestTransactions.map(t => t._id);
        const products = await Product.find({
            itemId: { $in: itemIds }
        });

        res.json({
            products,
            transactions: latestTransactions.map(t => t.lastTransaction)
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching owned products', 
            error: error.message 
        });
    }
});

// Admin endpoint to get all products
app.get('/api/admin/products', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const products = await Product.find();
        const latestTransactions = await Promise.all(
            products.map(async (product) => {
                const transaction = await Transaction.findOne({ 
                    itemId: product.itemId 
                }).sort({ transactionDate: -1 });
                return {
                    ...product.toObject(),
                    currentOwner: transaction?.ownerId
                };
            })
        );

        res.json(latestTransactions);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error fetching products', 
            error: error.message 
        });
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});