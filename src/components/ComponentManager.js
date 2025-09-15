import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  DocumentIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

const ComponentManager = ({ inquiryId, onComponentsChange }) => {
  const [editingId, setEditingId] = useState(null);
  const [editingValues, setEditingValues] = useState({}); // Store individual editing values
  const [newComponent, setNewComponent] = useState({
    partRef: '',
    material: '',
    thickness: '',
    grade: '',
    quantity: 1,
    remarks: '',
    price: 0
  });
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [estimateNumber, setEstimateNumber] = useState('');
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch components for this inquiry
  const { data: components = [], isLoading, error } = useQuery(
    ['components', inquiryId],
    async () => {
      if (!inquiryId) return [];
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`/api/inquiry/${inquiryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('🔍 ComponentManager - Full inquiry response:', response.data);
      console.log('🔍 ComponentManager - Inquiry data:', response.data.inquiry);
      console.log('🔍 ComponentManager - Parts data:', response.data.inquiry.parts);
      console.log('🔍 ComponentManager - Parts type:', typeof response.data.inquiry.parts);
      console.log('🔍 ComponentManager - Parts length:', response.data.inquiry.parts?.length);
      
      // Log each part individually
      if (response.data.inquiry.parts && response.data.inquiry.parts.length > 0) {
        response.data.inquiry.parts.forEach((part, index) => {
          console.log(`🔍 ComponentManager - Part ${index}:`, part);
          console.log(`🔍 ComponentManager - Part ${index} partRef:`, part.partRef);
          console.log(`🔍 ComponentManager - Part ${index} keys:`, Object.keys(part));
        });
      }
      
      return response.data.inquiry.parts || [];
    },
    { enabled: !!inquiryId }
  );

  // Update inquiry mutation
  const updateInquiryMutation = useMutation(
    async (updatedParts) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/inquiry/${inquiryId}`, {
        parts: updatedParts
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['components', inquiryId]);
        if (onComponentsChange) {
          onComponentsChange();
        }
      }
    }
  );

  // Add new component
  const addComponent = () => {
    if (!newComponent.partRef || !newComponent.material || !newComponent.thickness) {
      alert('Please fill in all required fields');
      return;
    }

    const componentToAdd = {
      ...newComponent,
      created: new Date(),
      modified: new Date()
    };

    const updatedComponents = [...components, componentToAdd];
    updateInquiryMutation.mutate(updatedComponents);

    // Reset form
    setNewComponent({
      partRef: '',
      material: '',
      thickness: '',
      grade: '',
      quantity: 1,
      remarks: '',
      price: 0
    });
  };

  // Start editing
  const startEditing = (id) => {
    setEditingId(id);
    // Initialize editing values with current component data
    const component = components.find(comp => comp._id === id || comp.partRef === id);
    if (component) {
      setEditingValues({
        partRef: component.partRef || '',
        material: component.material || '',
        thickness: component.thickness || '',
        grade: component.grade || '',
        quantity: component.quantity || 1,
        remarks: component.remarks || '',
        price: component.price || 0
      });
    }
  };

  // Save edit
  const saveEdit = (id) => {
    // Update the component with editing values
    const updatedComponents = components.map(comp => {
      if (comp._id === id || comp.partRef === id) {
        return { 
          ...comp, 
          ...editingValues,
          modified: new Date() 
        };
      }
      return comp;
    });
    
    updateInquiryMutation.mutate(updatedComponents);
    setEditingId(null);
    setEditingValues({});
  };

  // Handle individual component field update with debouncing
  const handleComponentFieldUpdate = (componentId, field, value) => {
    // Only update the specific component field
    const updatedComponents = components.map(comp => {
      if (comp._id === componentId || comp.partRef === componentId) {
        return { 
          ...comp, 
          [field]: value, 
          modified: new Date() 
        };
      }
      return comp; // Return unchanged component
    });
    
    // Update only if the component actually changed
    const hasChanges = updatedComponents.some((comp, index) => {
      const originalComp = components[index];
      return comp[field] !== originalComp[field];
    });
    
    if (hasChanges) {
      updateInquiryMutation.mutate(updatedComponents);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditingValues({});
  };

  // Delete component
  const deleteComponent = (id) => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      const updatedComponents = components.filter(comp => 
        comp._id !== id && comp.partRef !== id
      );
      updateInquiryMutation.mutate(updatedComponents);
    }
  };

  // Handle file drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // Process uploaded files
  const handleFiles = async (files) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(`/api/inquiry/${inquiryId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Refresh components to show new data
        queryClient.invalidateQueries(['components', inquiryId]);
        setUploadedFiles(prev => [...prev, ...Array.from(files)]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files. Please try again.');
    }
  };

  // Download Excel template
  const downloadExcelTemplate = async () => {
    try {
      const response = await axios.get('/api/inquiry/excel-template', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'component_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Error downloading template. Please try again.');
    }
  };

  console.log('🔍 ComponentManager - Components data:', components);
  console.log('🔍 ComponentManager - Components length:', components.length);
  console.log('🔍 ComponentManager - Is loading:', isLoading);
  console.log('🔍 ComponentManager - Error:', error);

  if (isLoading) return <div className="text-center py-8">Loading components...</div>;
  if (error) return <div className="text-center py-8 text-red-600">Error loading components</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 bg-white rounded-lg shadow-lg">
      {/* Header Information */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
          Material & Thickness Data added through Admin (Back Office)
        </h2>
        <p className="text-sm md:text-base text-gray-600 mb-6">
          Customer can Edit the inquiry anytime before order acceptance. Each time
        </p>
      </div>

      {/* New Estimate Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          New Estimate
        </label>
        <input
          type="text"
          value={estimateNumber}
          onChange={(e) => setEstimateNumber(e.target.value)}
          placeholder="Enter estimate number"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* File Upload Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Upload Component Files</h3>
          <button
            onClick={downloadExcelTemplate}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            <DocumentIcon className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Download Excel Template</span>
            <span className="sm:hidden">Download Template</span>
          </button>
        </div>
        
        <div
          className={`border-2 border-dashed rounded-lg p-4 md:p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-100'
          }`}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CloudArrowUpIcon className="mx-auto h-8 w-8 md:h-12 md:w-12 text-gray-400 mb-4" />
          <p className="text-sm md:text-lg font-medium text-gray-700 mb-2">
            <span className="hidden sm:inline">DRAG AND DROP HERE OR CLICK TO CHOOSE FILES</span>
            <span className="sm:hidden">CLICK TO CHOOSE FILES</span>
          </p>
          <p className="text-xs md:text-sm text-gray-500 mb-4">
            Support for Excel (.xlsx, .xls), CAD files (.dxf, .dwg), and other formats
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 md:px-6 md:py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm md:text-base"
          >
            Choose Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.dxf,.dwg,.pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Components Table */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Component List</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 hidden sm:inline">Columns:</span>
            <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
              <option>5 columns showing</option>
              <option>4 columns showing</option>
              <option>3 columns showing</option>
            </select>
          </div>
        </div>

        {/* Mobile View - Cards */}
        <div className="block md:hidden space-y-4">
          {components.map((component, index) => {
            console.log(`🔍 ComponentManager - Mobile rendering component ${index}:`, component);
            const isEditing = editingId === (component._id || component.partRef);
            return (
              <div key={component._id || component.partRef || index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingValues.partRef || ''}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, partRef: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        component.partRef || 'No Part Ref'
                      )}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {component.material} • {component.thickness}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(component._id || component.partRef)}
                          className="text-green-600 hover:text-green-800 p-1"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEditing(component._id || component.partRef)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteComponent(component._id || component.partRef)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Material:</span> {component.material}
                  </div>
                  <div>
                    <span className="font-medium">Thickness:</span> {component.thickness}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(component.created).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Modified:</span> {new Date(component.modified).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer hover:bg-gray-100 min-w-[120px]">
                  <div className="flex items-center">
                    Part Ref
                    <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer hover:bg-gray-100 min-w-[100px]">
                  <div className="flex items-center">
                    Material
                    <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer hover:bg-gray-100 min-w-[100px]">
                  <div className="flex items-center">
                    Thickness
                    <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer hover:bg-gray-100 min-w-[100px]">
                  <div className="flex items-center">
                    Created
                    <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b cursor-pointer hover:bg-gray-100 min-w-[100px]">
                  <div className="flex items-center">
                    Modified
                    <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b min-w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {components.map((component, index) => {
                console.log(`🔍 ComponentManager - Rendering component ${index}:`, component);
                console.log(`🔍 ComponentManager - Component ${index} partRef:`, component.partRef);
                const isEditing = editingId === (component._id || component.partRef);
                return (
                  <tr key={component._id || component.partRef || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 border-b">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingValues.partRef || ''}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, partRef: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">
                          {component.partRef || 'No Part Ref'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b">
                      {isEditing ? (
                        <select
                          value={editingValues.material || ''}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, material: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Material</option>
                          <option value="Zintec">Zintec</option>
                          <option value="Stainless Steel">Stainless Steel</option>
                          <option value="Aluminum">Aluminum</option>
                          <option value="Copper">Copper</option>
                          <option value="Brass">Brass</option>
                        </select>
                      ) : (
                        component.material
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingValues.thickness || ''}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, thickness: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        component.thickness
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b">
                      {new Date(component.created).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b">
                      {new Date(component.modified).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b">
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(component._id || component.partRef)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <CheckIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditing(component._id || component.partRef)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteComponent(component._id || component.partRef)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Component Form */}
      <div className="mb-8 p-4 md:p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Component</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part Ref</label>
            <input
              type="text"
              value={newComponent.partRef}
              onChange={(e) => setNewComponent({...newComponent, partRef: e.target.value})}
              placeholder="Part reference"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
            <select
              value={newComponent.material}
              onChange={(e) => setNewComponent({...newComponent, material: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Material</option>
              <option value="Zintec">Zintec</option>
              <option value="Stainless Steel">Stainless Steel</option>
              <option value="Aluminum">Aluminum</option>
              <option value="Copper">Copper</option>
              <option value="Brass">Brass</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thickness</label>
            <input
              type="text"
              value={newComponent.thickness}
              onChange={(e) => setNewComponent({...newComponent, thickness: e.target.value})}
              placeholder="e.g., 1.5mm"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              value={newComponent.quantity}
              onChange={(e) => setNewComponent({...newComponent, quantity: parseInt(e.target.value)})}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <input
              type="text"
              value={newComponent.grade}
              onChange={(e) => setNewComponent({...newComponent, grade: e.target.value})}
              placeholder="Material grade"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <input
              type="number"
              step="0.01"
              value={newComponent.price}
              onChange={(e) => setNewComponent({...newComponent, price: parseFloat(e.target.value)})}
              placeholder="Unit price"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea
            value={newComponent.remarks}
            onChange={(e) => setNewComponent({...newComponent, remarks: e.target.value})}
            placeholder="Additional notes or specifications"
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={addComponent}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Component
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-start">
        <button
          onClick={() => {
            if (onComponentsChange) {
              onComponentsChange();
            }
            alert('All changes have been saved automatically!');
          }}
          className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm md:text-base"
        >
          SAVE
        </button>
      </div>
    </div>
  );
};

export default ComponentManager;
