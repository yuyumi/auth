import React, { useState, useEffect } from 'react';

const App = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [productId, setProductId] = useState('');
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState('');

  const API_URL = process.env.RAILWAY_STATIC_URL || 'http://localhost:3000/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProducts();
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setProducts(data);
      }
    } catch (error) {
      setMessage('Error fetching products');
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
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.token);
          setUserId(data.userId);
          fetchProducts();
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
        setMessage('Product added successfully');
        setProductId('');
        fetchProducts();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Error adding product');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
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
              <h2 className="text-2xl font-bold mb-2">Your User ID</h2>
              <p className="bg-gray-100 p-2 rounded">{userId}</p>
            </div>
            
            <h2 className="text-2xl font-bold mb-4">Add Product</h2>
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
                Add Product
              </button>
            </form>
            
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Your Products</h2>
              {products.length > 0 ? (
                <div className="space-y-2">
                  {products.map((product, index) => (
                    <div key={index} className="bg-gray-100 p-3 rounded">
                      <p><strong>Product ID:</strong> {product.productId}</p>
                      <p><strong>Added:</strong> {new Date(product.transactionDate).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No products added yet</p>
              )}
            </div>
            
            <button
              onClick={() => {
                localStorage.removeItem('token');
                setUserId('');
                setProducts([]);
                window.location.reload();
              }}
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