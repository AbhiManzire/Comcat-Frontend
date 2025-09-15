import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { inquiryAPI } from '../../services/api';
import ComponentManager from '../../components/ComponentManager';
import { useAuth } from '../../contexts/AuthContext';

const InquiryDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComponentManager, setShowComponentManager] = useState(false);

  useEffect(() => {
    fetchInquiry();
  }, [id]);

  const fetchInquiry = async () => {
    try {
      setLoading(true);
      
      // Use admin API if user is admin/backoffice, otherwise use regular API
      const isAdmin = user?.role === 'admin' || user?.role === 'backoffice' || user?.role === 'subadmin';
      const response = isAdmin 
        ? await inquiryAPI.getInquiryAdmin(id)
        : await inquiryAPI.getInquiry(id);
      
      if (response.data.success) {
        const inquiryData = response.data.inquiry;
        
        // Transform the data to match the component's expected format
        setInquiry({
          id: inquiryData.inquiryNumber,
          inquiryId: inquiryData._id,
          status: inquiryData.status,
          createdAt: new Date(inquiryData.createdAt).toLocaleString(),
          customer: {
            name: `${inquiryData.customer.firstName} ${inquiryData.customer.lastName}`,
            company: inquiryData.customer.companyName || 'N/A'
          },
          deliveryAddress: inquiryData.deliveryAddress || {
            street: 'N/A',
            city: 'N/A',
            country: 'N/A'
          },
          specifications: inquiryData.parts || [],
          files: inquiryData.files || [],
          specialInstructions: inquiryData.specialInstructions || 'No special instructions',
          timeline: generateTimeline(inquiryData)
        });
      } else {
        toast.error(response.data.message || 'Failed to fetch inquiry details');
      }
    } catch (error) {
      console.error('Error fetching inquiry:', error);
      toast.error('Failed to fetch inquiry details');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeline = (inquiryData) => {
    const timeline = [
      {
        event: 'Inquiry Created',
        date: new Date(inquiryData.createdAt).toLocaleString(),
        status: 'completed',
        color: 'green'
      }
    ];

    if (inquiryData.status === 'quoted' || inquiryData.status === 'order_created') {
      timeline.push({
        event: 'Under Review',
        description: 'Being processed by our team',
        status: 'completed',
        color: 'blue'
      });
      
      timeline.push({
        event: 'Quotation Ready',
        description: 'Price and delivery details available',
        status: 'completed',
        color: 'green'
      });
    }

    if (inquiryData.status === 'order_created') {
      timeline.push({
        event: 'Order Created',
        description: 'Order has been placed',
        status: 'completed',
        color: 'purple'
      });
    }

    return timeline;
  };

  const handleComponentsChange = () => {
    // Refresh inquiry data when components are updated
    fetchInquiry();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'quoted':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Inquiry not found</h1>
            <Link to="/inquiries" className="text-blue-600 hover:text-blue-800">
              Back to Inquiries
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <Link
              to="/inquiries"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Inquiries
            </Link>
          </div>

          {/* Inquiry Header */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{inquiry.id}</h1>
                <p className="text-sm text-gray-500 mt-1">Created on {inquiry.createdAt}</p>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowComponentManager(!showComponentManager)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {showComponentManager ? 'Hide Components' : 'Manage Components'}
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Quoted
                </button>
              </div>
            </div>
          </div>

          {/* Component Manager */}
          {showComponentManager && (
            <div className="mb-6">
              <ComponentManager 
                inquiryId={inquiry.inquiryId} 
                onComponentsChange={handleComponentsChange}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Technical Specifications */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Specifications</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thickness</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inquiry.specifications.map((spec, index) => (
                        <tr key={index}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{spec.material}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{spec.thickness}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{spec.quantity}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{spec.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Uploaded Files */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Files</h3>
                <div className="space-y-3">
                  {inquiry.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-xs">
                              {file.type === 'ZIP' ? '📦' : file.type === 'Excel' ? '📊' : '📄'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">.{file.type} • {file.size}</p>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Special Instructions</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{inquiry.specialInstructions}</p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm text-gray-900">{inquiry.customer.name}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-sm text-gray-900">{inquiry.customer.company}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Address</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm text-gray-900">{inquiry.deliveryAddress.street}</span>
                  </div>
                  <p className="text-sm text-gray-700 ml-8">{inquiry.deliveryAddress.city}</p>
                  <p className="text-sm text-gray-700 ml-8">{inquiry.deliveryAddress.country}</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-4">
                  {inquiry.timeline.map((event, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full mt-1 ${
                          event.color === 'green' ? 'bg-green-500' : 
                          event.color === 'blue' ? 'bg-blue-500' : 'bg-gray-500'
                        }`}></div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{event.event}</p>
                        {event.description && (
                          <p className="text-xs text-gray-600">{event.description}</p>
                        )}
                        <p className="text-xs text-gray-500">{event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InquiryDetail;
