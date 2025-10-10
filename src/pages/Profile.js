import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderAPI, inquiryAPI } from '../services/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Format address properly
      let formattedAddress = '';
      if (user.address) {
        if (typeof user.address === 'string') {
          formattedAddress = user.address;
        } else if (typeof user.address === 'object') {
          // Format address object into readable text
          const addr = user.address;
          const addressParts = [];
          if (addr.street) addressParts.push(addr.street);
          if (addr.city) addressParts.push(addr.city);
          if (addr.state) addressParts.push(addr.state);
          if (addr.zipCode) addressParts.push(addr.zipCode);
          if (addr.country) addressParts.push(addr.country);
          formattedAddress = addressParts.join(', ');
        }
      }

      setFormData({
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        company: user.companyName || '',
        address: formattedAddress
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateProfile(formData);
      
      if (result.success) {
        toast.success('Profile updated successfully!');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An error occurred while updating profile');
    } finally {
      setLoading(false);
    }
  };

  // Real data for orders and inquiries
  const [orders, setOrders] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  // Fetch customer orders
  const fetchOrders = async () => {
    if (!user?._id || user?.role !== 'customer') return;
    
    try {
      setOrdersLoading(true);
      const response = await orderAPI.getCustomerOrders(user._id);
      
      if (response.data.success) {
        const transformedOrders = response.data.orders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' '),
          total: order.totalAmount,
          date: new Date(order.createdAt).toISOString().split('T')[0],
          items: order.parts ? order.parts.map(part => part.name || part.description || 'Part') : ['Custom Parts']
        }));
        setOrders(transformedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch customer inquiries
  const fetchInquiries = async () => {
    if (!user?._id || user?.role !== 'customer') return;
    
    try {
      setInquiriesLoading(true);
      const response = await inquiryAPI.getCustomerInquiries();
      
      if (response.data.success) {
        const transformedInquiries = response.data.inquiries.map(inquiry => ({
          id: inquiry._id,
          title: inquiry.title || `Inquiry ${inquiry.inquiryNumber}`,
          description: inquiry.description || inquiry.specialInstructions || 'Custom sheet metal parts inquiry',
          status: inquiry.status,
          date: new Date(inquiry.createdAt).toISOString().split('T')[0],
          quoteAmount: inquiry.quotation ? inquiry.quotation.totalAmount : null,
          files: inquiry.files ? inquiry.files.map(file => file.originalName || file.filename) : []
        }));
        setInquiries(transformedInquiries);
      } else {
        setInquiries([]);
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      setInquiries([]);
    } finally {
      setInquiriesLoading(false);
    }
  };

  // Fetch data when user changes or tab changes
  useEffect(() => {
    if (user?._id && user?.role === 'customer') {
      if (activeTab === 'orders') {
        fetchOrders();
      } else if (activeTab === 'inquiries') {
        fetchInquiries();
      }
    }
  }, [user, activeTab]);

  // Role-based tabs - admin users don't need Order History and Inquiries
  const getTabs = () => {
    if (user?.role === 'admin' || user?.role === 'backoffice' || user?.role === 'subadmin') {
      return [
        { id: 'profile', name: 'Profile Information' }
      ];
    } else {
      return [
        { id: 'profile', name: 'Profile Information' },
        { id: 'orders', name: 'Order History' },
        { id: 'inquiries', name: 'Inquiries' }
      ];
    }
  };

  const tabs = getTabs();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto ">
        <div className="px-4 py-6 sm:px-0">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Profile
            </h1>
            <p className="text-gray-600">
              Manage your account and view your activity
            </p>
          </div>

          {/* Tabs Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {activeTab === 'profile' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
                
                {/* Admin Role Indicator */}
                {(user?.role === 'admin' || user?.role === 'backoffice' || user?.role === 'subadmin') && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">A</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-900">
                          {user?.role === 'admin' ? 'Administrator Account' : 
                           user?.role === 'backoffice' ? 'Back Office Account' : 
                           'Sub-Admin Account'}
                        </h3>
                        <p className="text-sm text-blue-700">
                          You have administrative access to manage inquiries, quotations, and orders.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="company"
                        id="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <textarea
                      name="address"
                      id="address"
                      rows={3}
                      value={formData.address}
                      onChange={handleChange}
                      className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">My Orders</h2>
                {ordersLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 mt-2">Loading orders...</p>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{order.orderNumber}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {order.items.join(', ')}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">Ordered on {order.date}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === 'In Production' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : order.status === 'Dispatched'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'Delivered'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'Confirmed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                            <p className="text-lg font-semibold text-gray-900 mt-2">
                              ${order.total.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No orders found.</p>
                    <p className="text-sm text-gray-400 mt-2">Your orders will appear here once you place them.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'inquiries' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">My Inquiries</h2>
                {inquiriesLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 mt-2">Loading inquiries...</p>
                  </div>
                ) : inquiries.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto space-y-6">
                    {inquiries.map((inquiry) => (
                      <div key={inquiry.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{inquiry.title}</h3>
                            <p className="text-sm text-gray-600 mb-3 leading-relaxed">{inquiry.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Submitted on {inquiry.date}</span>
                              {inquiry.quoteAmount && (
                                <span className="font-medium text-gray-900">
                                  Quote: ${inquiry.quoteAmount.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col items-end">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full mb-2 ${
                              inquiry.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : inquiry.status === 'quoted'
                                ? 'bg-blue-100 text-blue-800'
                                : inquiry.status === 'in_production'
                                ? 'bg-purple-100 text-purple-800'
                                : inquiry.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {inquiry.status === 'in_production' ? 'In Production' : 
                               inquiry.status === 'completed' ? 'Completed' :
                               inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Files Section */}
                        {inquiry.files && inquiry.files.length > 0 && (
                          <div className="border-t border-gray-100 pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">Attached Files:</span>
                                <div className="flex space-x-2">
                                  {inquiry.files.map((file, index) => (
                                    <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                      📎 {file}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                  View Details
                                </button>
                                {inquiry.status === 'quoted' && (
                                  <button className="text-sm text-green-600 hover:text-green-800 font-medium">
                                    Accept Quote
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No inquiries found.</p>
                    <p className="text-sm text-gray-400 mt-2">Your inquiries will appear here once you submit them.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
