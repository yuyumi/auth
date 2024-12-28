import React, { useState, useEffect } from 'react';
import QRGenerator from './QRGenerator';

const App = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('user');
  const [productId, setProductId] = useState('');
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [userType, setUserType] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [transferUserId, setTransferUserId] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [productHistory, setProductHistory] = useState([]);
  const [newProduct, setNewProduct] = useState(null);
  
  // Admin state
  const [pendingManufacturers, setPendingManufacturers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [adminTransferProduct, setAdminTransferProduct] = useState(null);
  const [showAdminTransfer, setShowAdminTransfer] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    const storedUserType = localStorage.getItem('accountType');
    if (token && storedUserId) {
      setUserId(storedUserId);
      setUserType(storedUserType);
      if (storedUserType === 'admin') {
        fetchPendingManufacturers();
        fetchAllProducts();
      } else {
        fetchOwnedProducts();
      }
    }
  }, []);

  const fetchPendingManufacturers = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/pending-manufacturers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingManufacturers(data);
      }
    } catch (error) {
      setMessage('Error fetching pending manufacturers');
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAllProducts(data);
      }
    } catch (error) {
      setMessage('Error fetching all products');
    }
  };

  const handleManufacturerVerification = async (manufacturerId, approve) => {
    try {
      const response = await fetch(`${API_URL}/admin/verify-manufacturer/${manufacturerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ approve })
      });
      
      if (response.ok) {
        setMessage(`Manufacturer ${approve ? 'approved' : 'rejected'}`);
        fetchPendingManufacturers();
      } else {
        setMessage('Error processing verification');
      }
    } catch (error) {
      setMessage('Error processing verification');
    }
  };

  const handleAdminTransfer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/admin/transfer-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          itemId: adminTransferProduct.itemId,
          newOwnerId: transferUserId
        })
      });
      
      if (response.ok) {
        setMessage('Product transferred successfully');
        setShowAdminTransfer(false);
        setTransferUserId('');
        setAdminTransferProduct(null);
        fetchAllProducts();
      } else {
        const data = await response.json();
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Error transferring product');
    }
  };

  // Admin Dashboard Component
  const AdminDashboard = () => (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Pending Manufacturer Verifications</h2>
        {pendingManufacturers.length > 0 ? (
          <div className="space-y-4">
            {pendingManufacturers.map((manufacturer) => (
              <div key={manufacturer.userId} className="bg-gray-100 p-4 rounded">
                <p><strong>Email:</strong> {manufacturer.email}</p>
                <p><strong>User ID:</strong> {manufacturer.userId}</p>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => handleManufacturerVerification(manufacturer.userId, true)}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleManufacturerVerification(manufacturer.userId, false)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No pending verifications</p>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">All Products</h2>
        {allProducts.length > 0 ? (
          <div className="space-y-4">
            {allProducts.map((product) => (
              <div key={product.itemId} className="bg-gray-100 p-4 rounded">
                <p><strong>Product ID:</strong> {product.productId}</p>
                <p><strong>Item ID:</strong> {product.itemId}</p>
                <p><strong>Current Owner:</strong> {product.currentOwner}</p>
                <div className="mt-2">
                  <button
                    onClick={() => {
                      setAdminTransferProduct(product);
                      setShowAdminTransfer(true);
                      setShowHistory(false);
                    }}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Transfer Ownership
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No products in the system</p>
        )}
      </div>

      {showAdminTransfer && adminTransferProduct && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Transfer Product Ownership</h3>
          <form onSubmit={handleAdminTransfer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">New Owner User ID</label>
              <input
                type="text"
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
            >
              Transfer Product
            </button>
          </form>
        </div>
      )}
    </div>
  );

  const fetchOwnedProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products/owned`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setProducts(data.products);
      }
    } catch (error) {
      setMessage('Error fetching products');
    }
  };

  const fetchProductHistory = async (itemId) => {
    try {
      const response = await fetch(`${API_URL}/products/${itemId}/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setProductHistory(data.transactions);
        setShowHistory(true);
      }
    } catch (error) {
      setMessage('Error fetching product history');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? 'login' : 'register';
    
    try {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email, 
          password,
          ...((!isLogin && accountType) && { accountType })
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userId', data.userId);
          localStorage.setItem('accountType', data.accountType);
          setUserId(data.userId);
          setUserType(data.accountType);
          fetchOwnedProducts();
        }
        setMessage(isLogin ? 'Logged in successfully' : 'Registered successfully');
        if (!isLogin) setIsLogin(true);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('An error occurred');
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ productId })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Product created successfully');
        setNewProduct(data.product); // Store the newly created product
        setProductId('');
        fetchOwnedProducts();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Error creating product');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/products/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          itemId: selectedProduct.itemId,
          newOwnerId: transferUserId
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Product transferred successfully');
        setShowTransferForm(false);
        setTransferUserId('');
        setSelectedProduct(null);
        fetchOwnedProducts();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Error transferring product');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('accountType');
    setUserId('');
    setUserType('');
    setProducts([]);
    setSelectedProduct(null);
    setShowTransferForm(false);
    setShowHistory(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        {message && (
          <div className="mb-4 p-4 rounded bg-blue-100 text-blue-700">
            {message}
          </div>
        )}
        
        {!localStorage.getItem('token') ? (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              {isLogin ? 'Login' : 'Register'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  required
                />
              </div>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  >
                    <option value="user">User</option>
                    <option value="manufacturer">Manufacturer</option>
                  </select>
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
              >
                {isLogin ? 'Login' : 'Register'}
              </button>
            </form>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="mt-4 text-blue-500 hover:text-blue-600"
            >
              {isLogin ? 'Need to register?' : 'Already have an account?'}
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Account Information</h2>
              <p className="bg-gray-100 p-2 rounded mb-2">
                <strong>User ID:</strong> {userId}
              </p>
              <p className="bg-gray-100 p-2 rounded">
                <strong>Account Type:</strong> {userType}
              </p>
            </div>
            
            {userType === 'admin' ? (
              <AdminDashboard />
            ) : (
              <div>
                {userType === 'manufacturer' && (
                  <>
                    <h2 className="text-2xl font-bold mb-4">Create New Product</h2>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium">Product ID</label>
                        <input
                          type="text"
                          value={productId}
                          onChange={(e) => setProductId(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                      >
                        Create Product
                      </button>
                    </form>
                    
                    {newProduct && (
                      <div className="mt-6">
                        <h3 className="text-xl font-bold mb-2">Product Created Successfully</h3>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <QRGenerator
                            data={JSON.stringify({
                              itemId: newProduct.itemId
                            })}
                            size={64}
                          />
                        </div>
                        <button
                          onClick={() => setNewProduct(null)}
                          className="mt-4 w-full bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600"
                        >
                          Create Another Product
                        </button>
                      </div>
                    )}
                  </>
                )}
                <div className="mt-8">
                  <h2 className="text-2xl font-bold mb-4">Your Products</h2>
                  {products.length > 0 ? (
                    <div className="space-y-4">
                      {products.map((product) => (
                        <div key={product.itemId} className="bg-gray-100 p-4 rounded">
                          <p><strong>Product ID:</strong> {product.productId}</p>
                          <p><strong>Item ID:</strong> {product.itemId}</p>
                          <div className="mt-2 space-x-2">
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowTransferForm(true);
                                setShowHistory(false);
                              }}
                              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                            >
                              Transfer
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                fetchProductHistory(product.itemId);
                                setShowTransferForm(false);
                              }}
                              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                            >
                              View History
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No products owned yet</p>
                  )}
                </div>
  
                {showTransferForm && selectedProduct && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4">Transfer Product</h3>
                    <form onSubmit={handleTransfer} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium">New Owner User ID</label>
                        <input
                          type="text"
                          value={transferUserId}
                          onChange={(e) => setTransferUserId(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                      >
                        Transfer Product
                      </button>
                    </form>
                  </div>
                )}
  
                {showHistory && selectedProduct && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4">Product History</h3>
                    <div className="space-y-2">
                      {productHistory.map((transaction) => (
                        <div key={transaction.transactionId} className="bg-gray-100 p-3 rounded">
                          <p><strong>Transaction ID:</strong> {transaction.transactionId}</p>
                          <p><strong>Owner ID:</strong> {transaction.ownerId}</p>
                          {transaction.previousOwnerId && (
                            <p><strong>Previous Owner:</strong> {transaction.previousOwnerId}</p>
                          )}
                          <p><strong>Date:</strong> {new Date(transaction.transactionDate).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="mt-8 text-red-500 hover:text-red-600"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default App;