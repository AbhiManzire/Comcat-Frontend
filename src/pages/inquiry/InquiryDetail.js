import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { inquiryAPI } from '../../services/api';
import ComponentManager from '../../components/ComponentManager';
import QuotationPreparationModal from '../../components/QuotationPreparationModal';
import { useAuth } from '../../contexts/AuthContext';

const InquiryDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComponentManager, setShowComponentManager] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInquiry();
    }
  }, [id, user]);

  const fetchInquiry = async () => {
    try {
      setLoading(true);
      
      console.log('=== FETCHING INQUIRY ===');
      console.log('Inquiry ID:', id);
      console.log('User object:', user);
      console.log('User role:', user?.role);
      console.log('User ID:', user?._id);
      
      // Check if user is loaded
      if (!user) {
        console.log('User not loaded yet, waiting...');
        setLoading(false);
        return;
      }
      
      // Check if ID is valid
      if (!id || id === 'undefined' || id === 'null') {
        console.error('Invalid inquiry ID:', id);
        toast.error('Invalid inquiry ID');
        setLoading(false);
        return;
      }
      
      // Check if user has a valid token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Please login to view inquiry details');
        window.location.href = '/login';
        setLoading(false);
        return;
      }
      
      // Use admin API if user is admin/backoffice, otherwise use regular API
      const isAdmin = user?.role === 'admin' || user?.role === 'backoffice' || user?.role === 'subadmin';
      console.log('Is admin:', isAdmin);
      console.log('User role check:', {
        role: user?.role,
        isAdmin: user?.role === 'admin',
        isBackoffice: user?.role === 'backoffice',
        isSubadmin: user?.role === 'subadmin'
      });
      
      // Temporary workaround: if user email is admin@gmail.com, treat as admin
      const isAdminByEmail = user?.email === 'admin@gmail.com';
      const finalIsAdmin = isAdmin || isAdminByEmail;
      console.log('Final admin check:', { isAdmin, isAdminByEmail, finalIsAdmin });
      
      let response;
      try {
        if (finalIsAdmin) {
          console.log('Using admin API...');
          response = await inquiryAPI.getInquiryAdmin(id);
        } else {
          console.log('Using regular API...');
          response = await inquiryAPI.getInquiry(id);
        }
      } catch (apiError) {
        console.error('API call failed:', apiError);
        console.error('API error response:', apiError.response?.data);
        console.error('API error status:', apiError.response?.status);
        console.error('API error headers:', apiError.response?.headers);
        
        // Check for specific error types
        if (apiError.response?.status === 401) {
          toast.error('Authentication failed. Please login again.');
          // Clear auth data and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        } else if (apiError.response?.status === 403) {
          toast.error('Access denied. You do not have permission to view this inquiry.');
          return;
        } else if (apiError.response?.status === 404) {
          toast.error('Inquiry not found.');
          return;
        } else if (apiError.response?.status === 500) {
          toast.error('Server error. Please try again later.');
          return;
        } else if (apiError.code === 'ERR_NETWORK') {
          toast.error('Network error. Please check if the backend server is running on port 5000.');
          return;
        } else {
          toast.error(`API Error: ${apiError.response?.data?.message || apiError.message}`);
          return;
        }
      }
      
      console.log('API Response:', response);
      
      if (response.data.success) {
        const inquiryData = response.data.inquiry;
        console.log('Inquiry data received:', inquiryData);
        
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
        console.log('API returned error:', response.data.message);
        toast.error(response.data.message || 'Failed to fetch inquiry details');
      }
    } catch (error) {
      console.error('Error fetching inquiry:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error stack:', error.stack);
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

  const handleCreateQuotation = async (inquiryId, files) => {
    try {
      // Calculate total amount from inquiry parts
      const totalAmount = inquiry?.specifications?.reduce((total, part) => {
        return total + (part.quantity * (part.unitPrice || 0));
      }, 0) || 0;

      const quotationData = {
        inquiryId: inquiryId,
        customerInfo: {
          name: inquiry?.customer?.name || 'N/A',
          company: inquiry?.customer?.company || 'N/A',
          email: inquiry?.customer?.email || 'N/A',
          phone: inquiry?.customer?.phone || 'N/A'
        },
        totalAmount: totalAmount,
        items: inquiry?.specifications || []
      };

      // TODO: Call quotation API
      console.log('Creating quotation:', quotationData);
      toast.success('Quotation created successfully');
    } catch (error) {
      console.error('Error creating quotation:', error);
      throw error;
    }
  };

  const handleUploadQuotation = async (inquiryId, files) => {
    try {
      // TODO: Upload quotation PDF
      console.log('Uploading quotation:', { inquiryId, files });
      toast.success('Quotation uploaded successfully');
    } catch (error) {
      console.error('Error uploading quotation:', error);
      throw error;
    }
  };

  const handleFileDownload = async (file) => {
    try {
      // Get the auth token
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to download files');
        return;
      }

      // Use the correct API base URL
      const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const downloadUrl = `${apiBaseUrl}/inquiry/${id}/files/${file.fileName || file.name}/download`;
      
      console.log('Download URL:', downloadUrl);
      console.log('File data:', file);
      console.log('Inquiry ID:', id);
      console.log('File name:', file.fileName || file.name);
      
      // First, test if the backend is accessible
      try {
        const healthResponse = await fetch(`${apiBaseUrl.replace('/api', '')}/api/health`);
        if (healthResponse.ok) {
          console.log('Backend is accessible');
        } else {
          console.log('Backend health check failed');
        }
      } catch (healthError) {
        console.log('Backend health check error:', healthError);
        toast.error('Backend server is not accessible. Please check if the server is running on port 5000.');
        return;
      }
      
      // Add authorization header by creating a fetch request first
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed:', response.status, errorText);
        throw new Error(`Download failed: ${response.status} ${errorText}`);
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalName || file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('File download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download file: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'quoted':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
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
                {/* Only show Manage Components for Back Office users */}
                {(user?.role === 'admin' || user?.role === 'backoffice' || user?.role === 'subadmin' || user?.email === 'admin@gmail.com') && (
                  <button 
                    onClick={() => {
                      console.log('=== MANAGE COMPONENTS BUTTON CLICKED ===');
                      console.log('Current showComponentManager:', showComponentManager);
                      console.log('Inquiry ID:', inquiry?.inquiryId);
                      setShowComponentManager(!showComponentManager);
                      console.log('New showComponentManager will be:', !showComponentManager);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {showComponentManager ? 'Hide Components' : 'Manage Components'}
                  </button>
                )}
                
                {/* Status indicator - show for all users */}
                <button className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Quoted
                </button>
                
                {/* Only show Create Quotation for Back Office users */}
                {(user?.role === 'admin' || user?.role === 'backoffice' || user?.role === 'subadmin' || user?.email === 'admin@gmail.com') && (
                  <button 
                    onClick={() => {
                      console.log('Create Quotation button clicked');
                      console.log('Current showQuotationModal:', showQuotationModal);
                      setShowQuotationModal(true);
                      console.log('Setting showQuotationModal to true');
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Create Quotation
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Component Manager */}
          {showComponentManager && (
            <div className="mb-6">
              {console.log('=== RENDERING COMPONENT MANAGER ===')}
              {console.log('showComponentManager:', showComponentManager)}
              {console.log('inquiry.inquiryId:', inquiry?.inquiryId)}
              <ComponentManager 
                inquiryId={inquiry.inquiryId} 
                onComponentsChange={handleComponentsChange}
              />
            </div>
          )}

          {/* Technical Specifications - Full Width (Hidden when ComponentManager is active) */}
          {!showComponentManager && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Specifications</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <div className="max-h-96 overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db #f3f4f6'
              }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center">
                        PART REF
                        <svg className="ml-1 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center">
                        MATERIAL
                        <svg className="ml-1 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                      <div className="flex items-center">
                        THICKNESS
                        <svg className="ml-1 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                      <div className="flex items-center">
                        GRADE
                        <svg className="ml-1 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center">
                        REMARK
                        <svg className="ml-1 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                      <div className="flex items-center">
                        QUANTITY
                        <svg className="ml-1 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </th>
                  </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {inquiry.specifications && inquiry.specifications.length > 0 ? (
                    inquiry.specifications.map((spec, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span 
                              title={spec.partRef || spec.fileName || 'N/A'}
                              className="cursor-help max-w-[120px] truncate"
                            >
                              {(() => {
                                const fileName = spec.partRef || spec.fileName || 'N/A';
                                console.log('Filename:', fileName, 'Length:', fileName.length);
                                if (fileName.length > 10) {
                                  const truncated = fileName.substring(0, 10) + '...';
                                  console.log('Truncated:', truncated);
                                  return truncated;
                                }
                                return fileName;
                              })()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">{spec.material || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{spec.thickness || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{spec.grade || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{spec.remarks || spec.remark || 'No remarks'}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{spec.quantity || 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
                        No technical specifications available
                      </td>
                    </tr>
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}

          {/* Main Content (Hidden when ComponentManager is active) */}
          {!showComponentManager && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">

              {/* Uploaded Files */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Files</h3>
                <div className="space-y-3">
                  {inquiry.files && inquiry.files.length > 0 ? (
                    inquiry.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-xs">
                                {file.fileType === '.zip' ? '📦' : 
                                 file.fileType === '.xlsx' || file.fileType === '.xls' ? '📊' : 
                                 file.fileType === '.pdf' ? '📄' : '📄'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <p 
                              className="text-sm font-medium text-gray-900 truncate max-w-[200px]" 
                              title={file.originalName || file.name}
                            >
                              {(() => {
                                const fileName = file.originalName || file.name || 'N/A';
                                if (fileName.length > 25) {
                                  return fileName.substring(0, 25) + '...';
                                }
                                return fileName;
                              })()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {file.fileType || file.type} • {(file.fileSize || file.size) ? `${Math.round((file.fileSize || file.size) / 1024)} KB` : 'Unknown size'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleFileDownload(file)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-2">📄</div>
                      <p className="text-sm text-gray-500">No files uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Instructions */}
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
              {/* <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Special Instructions</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{inquiry.specialInstructions}</p>
                </div>
              </div> */}
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
              
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Quotation Preparation Modal */}
      {console.log('Rendering modal check:', { showQuotationModal, inquiry: inquiry?.id })}
      {showQuotationModal && (
        <QuotationPreparationModal
          isOpen={showQuotationModal}
          onClose={() => setShowQuotationModal(false)}
          inquiryId={inquiry?.id}
          customerInfo={{
            name: inquiry?.customer?.name || 'N/A',
            company: inquiry?.customer?.company || 'N/A',
            email: inquiry?.customer?.email || 'N/A'
          }}
          totalAmount={inquiry?.specifications?.reduce((total, part) => {
            return total + (part.quantity * (part.unitPrice || 0));
          }, 0) || 0}
          onCreateQuotation={handleCreateQuotation}
          onUploadQuotation={handleUploadQuotation}
        />
      )}
    </div>
  );
};

export default InquiryDetail;
