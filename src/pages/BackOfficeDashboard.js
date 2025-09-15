import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InquiryList from './inquiry/InquiryList';
import OrderManagement from './order/OrderManagement';
import BackOfficeMaterialManagement from './BackOfficeMaterialManagement';
import QuotationForm from '../components/QuotationForm';
import SubAdminManagement from '../components/SubAdminManagement';
import { inquiryAPI, quotationAPI, orderAPI, adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const BackOfficeDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inquiries');
  const [loading, setLoading] = useState(true);
  const [pendingInquiries, setPendingInquiries] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch inquiries
      const inquiryResponse = await inquiryAPI.getAllInquiries();
      if (inquiryResponse.data.success) {
        const transformedInquiries = inquiryResponse.data.inquiries.map(inquiry => ({
          id: inquiry.inquiryNumber,
          customer: `${inquiry.customer?.firstName || ''} ${inquiry.customer?.lastName || ''}`.trim() || 'N/A',
          company: inquiry.customer?.companyName || 'N/A',
          files: inquiry.files?.length || 0,
          parts: inquiry.parts?.length || 0,
          status: inquiry.status,
          date: new Date(inquiry.createdAt).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
          }),
          _id: inquiry._id,
          // Keep full inquiry data for quotation creation
          inquiryNumber: inquiry.inquiryNumber,
          parts: inquiry.parts || [],
          customerData: inquiry.customer
        }));
        setPendingInquiries(transformedInquiries);
      }

      // Fetch quotations
      const quotationResponse = await quotationAPI.getAllQuotations();
      if (quotationResponse.data.success) {
        const transformedQuotations = quotationResponse.data.quotations.map(quotation => ({
          id: quotation.quotationNumber,
          inquiryId: quotation.inquiry?.inquiryNumber || 'N/A',
          customer: `${quotation.inquiry?.customer?.firstName || ''} ${quotation.inquiry?.customer?.lastName || ''}`.trim() || 'N/A',
          company: quotation.inquiry?.customer?.companyName || 'N/A',
          amount: quotation.totalAmount,
          status: quotation.status,
          date: new Date(quotation.createdAt).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
          }),
          _id: quotation._id
        }));
        setQuotations(transformedQuotations);
      }

      // Fetch orders using admin API
      try {
        console.log('Fetching orders using adminAPI.getAllOrders()...');
        console.log('Current user:', user);
        console.log('Current user token:', localStorage.getItem('token'));
        console.log('User role:', user?.role);
        
        if (!user || !['admin', 'backoffice'].includes(user.role)) {
          console.log('User not authorized to fetch orders');
          setOrders([]);
          return;
        }
        
        const orderResponse = await adminAPI.getAllOrders();
        console.log('Order response received:', orderResponse);
        if (orderResponse.data.success) {
          const transformedOrders = orderResponse.data.orders.map(order => ({
            id: order.orderNumber,
            orderId: order.orderNumber,
            customer: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'N/A',
            items: order.parts?.length || 0,
            status: order.status,
            amount: order.totalAmount,
            date: new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric'
            }),
            _id: order._id
          }));
          setOrders(transformedOrders);
        } else {
          console.log('Orders API returned error:', orderResponse.data.message);
          setOrders([]);
        }
      } catch (orderError) {
        console.error('Error fetching orders:', orderError);
        console.error('Order error details:', orderError.response?.data);
        console.error('Order error status:', orderError.response?.status);
        console.error('Order error headers:', orderError.response?.headers);
        
        if (orderError.response?.status === 401) {
          toast.error('Authentication failed. Please login again.');
        } else if (orderError.response?.status === 403) {
          toast.error('Access denied. You do not have permission to view orders.');
        } else if (orderError.response?.status === 500) {
          toast.error('Server error. Please try again later.');
        } else {
          toast.error(`Failed to fetch orders: ${orderError.response?.data?.message || orderError.message}`);
        }
        
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotation = (inquiry) => {
    setSelectedInquiry(inquiry);
    setShowQuotationForm(true);
  };

  const handleQuotationSuccess = (quotation) => {
    toast.success(`Quotation ${quotation.quotationNumber} created successfully!`);
    // Refresh the inquiries list
    fetchData();
  };

  const handleCloseQuotationForm = () => {
    setShowQuotationForm(false);
    setSelectedInquiry(null);
  };

  const handleSendQuotation = async (quotationId) => {
    try {
      const response = await quotationAPI.sendQuotation(quotationId);
      
      if (response.data.success) {
        toast.success('Quotation sent to customer successfully!');
        // Refresh the quotations list
        fetchData();
      } else {
        toast.error(response.data.message || 'Failed to send quotation');
      }
    } catch (error) {
      console.error('Error sending quotation:', error);
      toast.error('Failed to send quotation');
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-2 sm:px-6 lg:px-8">
        <div className="px-4 py-2 sm:px-0">
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-600">Loading user data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-2 sm:px-6 lg:px-8">
        <div className="px-4 py-2 sm:px-0">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-2 sm:px-6 lg:px-8">
        <div className="px-4 py-2 sm:px-0">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Back Office Dashboard</h1>
            <p className="mt-1 text-gray-600 text-sm">Manage inquiries, quotations, and orders</p>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6 bg-white rounded-lg shadow-lg border-2 border-gray-200">
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin Dashboard Navigation</h3>
              <nav className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('inquiries')}
                  className={`px-4 py-3 rounded-lg font-medium text-sm flex items-center space-x-2 transition-all duration-200 ${
                    activeTab === 'inquiries'
                      ? 'bg-green-500 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                  }`}
                >
                  <span className="text-lg">📄</span>
                  <span>Inquiries</span>
                </button>
                <button
                  onClick={() => setActiveTab('quotations')}
                  className={`px-4 py-3 rounded-lg font-medium text-sm flex items-center space-x-2 transition-all duration-200 ${
                    activeTab === 'quotations'
                      ? 'bg-green-500 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                  }`}
                >
                  <span className="text-lg">🏷️</span>
                  <span>Quotations</span>
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-3 rounded-lg font-medium text-sm flex items-center space-x-2 transition-all duration-200 ${
                    activeTab === 'orders'
                      ? 'bg-green-500 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                  }`}
                >
                  <span className="text-lg">📦</span>
                  <span>Orders</span>
                </button>
                <button
                  onClick={() => setActiveTab('material')}
                  className={`px-4 py-3 rounded-lg font-medium text-sm flex items-center space-x-2 transition-all duration-200 ${
                    activeTab === 'material'
                      ? 'bg-green-500 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                  }`}
                >
                  <span className="text-lg">⚙️</span>
                  <span>Material & Thickness Data</span>
                </button>
                <button
                  onClick={() => setActiveTab('subadmins')}
                  className={`px-4 py-3 rounded-lg font-medium text-sm flex items-center space-x-2 transition-all duration-200 ${
                    activeTab === 'subadmins'
                      ? 'bg-green-500 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                  }`}
                >
                  <span className="text-lg">👥</span>
                  <span>Sub-Admins</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'inquiries' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Pending Inquiries</h3>
                <p className="text-sm text-gray-600 mt-1">Review and create quotations for customer inquiries</p>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db #f3f4f6'
              }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        INQUIRY
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CUSTOMER
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PARTS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        STATUS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DATE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingInquiries.map((inquiry) => (
                      <tr key={inquiry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{inquiry.id}</div>
                          <div className="text-sm text-gray-500">{inquiry.files} files</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{inquiry.customer}</div>
                          <div className="text-sm text-gray-500">{inquiry.company}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {inquiry.parts?.length || 0} parts
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {inquiry.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {inquiry.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link
                              to={`/inquiry/${inquiry._id}`}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </Link>
                            {inquiry.status === 'pending' && (
                              <button
                                onClick={() => handleCreateQuotation(inquiry)}
                                className="text-green-600 hover:text-green-900 flex items-center"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Quote
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'quotations' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quotations</h3>
                <p className="text-sm text-gray-600 mt-1">Manage customer quotations and pricing</p>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db #f3f4f6'
              }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inquiry ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotations.map((quotation) => (
                      <tr key={quotation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {quotation.inquiryId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="text-sm font-medium text-gray-900">{quotation.customer}</div>
                          <div className="text-sm text-gray-500">{quotation.company}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${quotation.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            quotation.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            quotation.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                            quotation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            quotation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {quotation.status?.charAt(0).toUpperCase() + quotation.status?.slice(1) || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {quotation.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link
                              to={`/quotation/${quotation._id}`}
                              className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md text-sm font-medium"
                            >
                              View
                            </Link>
                            {quotation.status === 'draft' && (
                              <button 
                                onClick={() => handleSendQuotation(quotation._id)}
                                className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md text-sm font-medium"
                              >
                                Send
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {quotations.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                          No quotations found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Orders</h3>
                <p className="text-sm text-gray-600 mt-1">Manage production orders and tracking</p>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db #f3f4f6'
              }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.items}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'in_production' ? 'bg-purple-100 text-purple-800' :
                            order.status === 'ready_for_dispatch' ? 'bg-orange-100 text-orange-800' :
                            order.status === 'dispatched' ? 'bg-indigo-100 text-indigo-800' :
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1).replace('_', ' ') || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                            to={`/order/${order._id}`}
                          className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                          No orders found
                      </td>
                    </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'material' && (
            <BackOfficeMaterialManagement />
          )}

          {activeTab === 'subadmins' && (
            <SubAdminManagement />
          )}
        </div>
      </div>

      {/* Quotation Form Modal */}
      {showQuotationForm && selectedInquiry && (
        <QuotationForm
          inquiry={selectedInquiry}
          onClose={handleCloseQuotationForm}
          onSuccess={handleQuotationSuccess}
        />
      )}
    </div>
  );
};

export default BackOfficeDashboard;
