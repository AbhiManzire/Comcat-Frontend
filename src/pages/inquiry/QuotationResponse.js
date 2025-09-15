import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { quotationAPI } from '../../services/api';
import toast from 'react-hot-toast';

const QuotationResponse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      setLoading(true);
      const response = await quotationAPI.getQuotation(id);
      
      if (response.data.success) {
        setQuotation(response.data.quotation);
      } else {
        toast.error(response.data.message || 'Failed to fetch quotation');
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast.error('Failed to fetch quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const response = await quotationAPI.respondToQuotation(id, {
        response: 'accepted',
        notes: 'Quotation accepted by customer'
      });
      
      if (response.data.success) {
        toast.success('Quotation accepted successfully! Redirecting to payment...');
        // Navigate to payment page
        navigate(`/quotation/${id}/payment`);
      } else {
        toast.error(response.data.message || 'Failed to accept quotation');
      }
    } catch (error) {
      console.error('Error accepting quotation:', error);
      toast.error('Failed to accept quotation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const response = await quotationAPI.respondToQuotation(id, {
        response: 'rejected',
        notes: 'Quotation rejected by customer'
      });
      
      if (response.data.success) {
        toast.success('Quotation rejected');
        setQuotation({ ...quotation, status: 'rejected' });
      } else {
        toast.error(response.data.message || 'Failed to reject quotation');
      }
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      toast.error('Failed to reject quotation');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-2 sm:px-6 lg:px-8">
        <div className="px-4 py-2 sm:px-0">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="max-w-4xl mx-auto py-2 sm:px-6 lg:px-8">
        <div className="px-4 py-2 sm:px-0">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Quotation not found</h1>
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">K</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">KOMACUT</h1>
                  <p className="text-xs text-gray-500">SHEET METAL PARTS ON DEMAND</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Home</Link>
              <Link to="/about" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">About</Link>
              <Link to="/services" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Services</Link>
              <Link to="/contact" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Contact</Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="text-gray-900 font-medium">admin admin</p>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Admin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quotation Response</h1>
          <p className="text-lg text-gray-600">Review and respond to your quotation</p>
        </div>

        {/* Quotation Details Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Quotation #{quotation.quotationNumber}</h2>
              <p className="text-lg text-gray-700">Inquiry #{quotation.inquiry?.inquiryNumber || 'N/A'}</p>
            </div>
            <div className="text-center lg:text-right">
              <p className="text-sm text-gray-600 font-medium mb-1">Valid Until</p>
              <p className="text-xl font-bold text-gray-900">
                {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Parts & Pricing Table */}
        <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-xl font-bold text-gray-900">Parts & Pricing</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    PART REFERENCE
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    MATERIAL
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    THICKNESS
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    QUANTITY
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    UNIT PRICE
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotation.parts?.map((part, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {part.partRef}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {part.material}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {part.thickness}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {part.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      ${part.unitPrice?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${part.totalPrice?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900">Total Amount:</span>
              <span className="text-3xl font-bold text-blue-600">
                ${quotation.totalAmount?.toFixed(2) || '0.00'} USD
              </span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-xl font-bold text-gray-900">Terms & Conditions</h3>
          </div>
          <div className="px-6 py-6">
            <p className="text-gray-700 leading-relaxed">{quotation.terms || 'Standard manufacturing terms apply. Payment required before production begins.'}</p>
          </div>
        </div>

        {/* Additional Notes */}
        {quotation.notes && (
          <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Additional Notes</h3>
            </div>
            <div className="px-6 py-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">{quotation.notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {quotation.status === 'sent' && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to proceed?</h3>
              <p className="text-gray-600">Choose your response to this quotation</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="flex-1 sm:flex-none px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                {actionLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept Quotation & Create Order
                  </>
                )}
              </button>
              
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 sm:flex-none px-8 py-4 bg-red-600 text-white text-lg font-semibold rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                {actionLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject Quotation
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {quotation.status === 'accepted' && (
          <div className="text-center mb-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 shadow-sm">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-green-800 font-bold text-xl mb-2">Quotation Accepted!</p>
              <p className="text-green-600 text-lg">
                Your order has been confirmed. You will receive further updates via email.
              </p>
            </div>
          </div>
        )}

        {quotation.status === 'rejected' && (
          <div className="text-center mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 shadow-sm">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <p className="text-red-800 font-bold text-xl mb-2">Quotation Rejected</p>
              <p className="text-red-600 text-lg">
                This quotation has been rejected. You can create a new inquiry if needed.
              </p>
            </div>
          </div>
        )}

        {/* Secure Transaction Message */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-blue-800 font-semibold text-lg">
                <strong>Secure Transaction.</strong> Your response will be securely processed and an order will be created upon acceptance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationResponse;
