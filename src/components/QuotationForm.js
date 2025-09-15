import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { quotationAPI } from '../services/api';
import toast from 'react-hot-toast';

const QuotationForm = ({ inquiry, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState([]);
  const [formData, setFormData] = useState({
    terms: 'Standard manufacturing terms apply. Payment required before production begins.',
    notes: '',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
  });

  // Helper function to safely extract customer data
  const getCustomerData = () => {
    if (!inquiry || !inquiry.customerData) {
      return {
        firstName: 'N/A',
        lastName: '',
        companyName: 'N/A',
        email: 'N/A'
      };
    }
    
    // Handle both object and string cases
    if (typeof inquiry.customerData === 'object') {
      return {
        firstName: inquiry.customerData.firstName || 'N/A',
        lastName: inquiry.customerData.lastName || '',
        companyName: inquiry.customerData.companyName || 'N/A',
        email: inquiry.customerData.email || 'N/A'
      };
    }
    
    return {
      firstName: 'N/A',
      lastName: '',
      companyName: 'N/A',
      email: 'N/A'
    };
  };

  useEffect(() => {
    if (inquiry) {
      // Initialize parts with inquiry data and add pricing fields
      // Ensure parts is an array before mapping
      const inquiryParts = Array.isArray(inquiry.parts) ? inquiry.parts : [];
      
      if (inquiryParts.length > 0) {
        const initialParts = inquiryParts.map(part => ({
          ...part,
          unitPrice: 0,
          totalPrice: 0,
          remarks: part.remarks || ''
        }));
        setParts(initialParts);
      } else {
        // If no parts exist, create a default part
        setParts([{
          partRef: 'Sample Part',
          material: 'Zintec',
          thickness: '1.5',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          remarks: ''
        }]);
      }
    }
  }, [inquiry]);

  const handlePartChange = (index, field, value) => {
    const updatedParts = [...parts];
    updatedParts[index] = {
      ...updatedParts[index],
      [field]: value
    };

    // Calculate total price when unit price or quantity changes
    if (field === 'unitPrice' || field === 'quantity') {
      const unitPrice = field === 'unitPrice' ? parseFloat(value) || 0 : updatedParts[index].unitPrice;
      const quantity = field === 'quantity' ? parseInt(value) || 0 : updatedParts[index].quantity;
      updatedParts[index].totalPrice = unitPrice * quantity;
    }

    setParts(updatedParts);
  };

  const addPart = () => {
    setParts([...parts, {
      partRef: '',
      material: 'Zintec',
      thickness: '1.5',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      remarks: ''
    }]);
  };

  const removePart = (index) => {
    if (parts.length > 1) {
      setParts(parts.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return parts.reduce((total, part) => total + (part.totalPrice || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (parts.length === 0) {
      toast.error('Please add at least one part');
      return;
    }

    if (parts.some(part => !part.unitPrice || part.unitPrice <= 0)) {
      toast.error('Please enter valid unit prices for all parts');
      return;
    }

    try {
      setLoading(true);
      
      const quotationData = {
        inquiryId: inquiry._id,
        parts: parts.map(part => ({
          partRef: part.partRef,
          material: part.material,
          thickness: part.thickness,
          quantity: part.quantity,
          unitPrice: part.unitPrice,
          totalPrice: part.totalPrice,
          remarks: part.remarks
        })),
        terms: formData.terms,
        notes: formData.notes,
        validUntil: formData.validUntil
      };

      const response = await quotationAPI.createQuotation(quotationData);
      
      if (response.data.success) {
        toast.success('Quotation created successfully!');
        onSuccess && onSuccess(response.data.quotation);
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to create quotation');
      }
    } catch (error) {
      console.error('Error creating quotation:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message;
        if (errorMessage?.includes('already exists')) {
          toast.error('A quotation already exists for this inquiry. You can view or update it from the quotations list.');
        } else {
          toast.error(errorMessage || 'Failed to create quotation');
        }
      } else {
        toast.error('Failed to create quotation');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!inquiry) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Create Quotation for {inquiry.inquiryNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3">
          {/* Customer Info */}
          <div className="mb-1 p-3 bg-gray-50 rounded-lg">
            <h3 className="text-base font-medium text-gray-900 mb-1">Customer Information</h3>
            {(() => {
              const customer = getCustomerData();
              return (
                <>
                  <p className="text-sm text-gray-600">
                    <strong>Name:</strong> {customer.firstName} {customer.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Company:</strong> {customer.companyName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Email:</strong> {customer.email}
                  </p>
                </>
              );
            })()}
          </div>

          {/* Parts Section */}
          <div className="mb-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Parts & Pricing</h3>
              <button
                type="button"
                onClick={addPart}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Part
              </button>
            </div>

            <div className="space-y-2">
              {parts.map((part, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-900">Part {index + 1}</h4>
                    {parts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePart(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Part Ref
                      </label>
                      <input
                        type="text"
                        value={part.partRef}
                        onChange={(e) => handlePartChange(index, 'partRef', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Material
                      </label>
                      <select
                        value={part.material}
                        onChange={(e) => handlePartChange(index, 'material', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="Zintec">Zintec</option>
                        <option value="Mild Steel">Mild Steel</option>
                        <option value="Stainless Steel">Stainless Steel</option>
                        <option value="Aluminium">Aluminium</option>
                        <option value="Copper">Copper</option>
                        <option value="Brass">Brass</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thickness
                      </label>
                      <select
                        value={part.thickness}
                        onChange={(e) => handlePartChange(index, 'thickness', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="0.5">0.5mm</option>
                        <option value="1.0">1.0mm</option>
                        <option value="1.5">1.5mm</option>
                        <option value="2.0">2.0mm</option>
                        <option value="2.5">2.5mm</option>
                        <option value="3.0">3.0mm</option>
                        <option value="4.0">4.0mm</option>
                        <option value="5.0">5.0mm</option>
                        <option value="6.0">6.0mm</option>
                        <option value="8.0">8.0mm</option>
                        <option value="10.0">10.0mm</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={part.quantity}
                        onChange={(e) => handlePartChange(index, 'quantity', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={part.unitPrice}
                        onChange={(e) => handlePartChange(index, 'unitPrice', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Price ($)
                      </label>
                      <input
                        type="number"
                        value={part.totalPrice}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <input
                      type="text"
                      value={part.remarks}
                      onChange={(e) => handlePartChange(index, 'remarks', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Additional notes for this part"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-600">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Terms and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms & Conditions
              </label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Additional notes for the customer"
              />
            </div>
          </div>

          {/* Valid Until */}
          <div className="mb-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valid Until
            </label>
            <input
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              className="w-full md:w-1/3 border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuotationForm;
