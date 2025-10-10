import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const BackOfficeMaterialManagement = () => {
  const [materialData, setMaterialData] = useState([]);
  const [newEstimate, setNewEstimate] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    material: '',
    thickness: '',
    grade: '',
    status: 'Active'
  });
  const { user } = useAuth();

  // Generate realistic material data for admin dashboard
  const generateMaterialData = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    return [
      {
        id: 1,
        material: 'Zintec',
        thickness: '1.5',
        grade: 'S275',
        status: 'Active',
        created: lastWeek.toLocaleDateString('en-US'),
        modified: yesterday.toLocaleDateString('en-US'),
        isEditing: false
      },
      {
        id: 2,
        material: 'Mild Steel',
        thickness: '2.0',
        grade: 'IS2062',
        status: 'Active',
        created: lastWeek.toLocaleDateString('en-US'),
        modified: today.toLocaleDateString('en-US'),
        isEditing: false
      },
      {
        id: 3,
        material: 'Stainless Steel',
        thickness: '1.0',
        grade: '304',
        status: 'Active',
        created: yesterday.toLocaleDateString('en-US'),
        modified: yesterday.toLocaleDateString('en-US'),
        isEditing: false
      },
      {
        id: 4,
        material: 'Aluminum',
        thickness: '2.5',
        grade: '6061-T6',
        status: 'Active',
        created: lastWeek.toLocaleDateString('en-US'),
        modified: lastWeek.toLocaleDateString('en-US'),
        isEditing: false
      },
      {
        id: 5,
        material: 'Galvanized Steel',
        thickness: '3.0',
        grade: 'G250',
        status: 'Active',
        created: today.toLocaleDateString('en-US'),
        modified: today.toLocaleDateString('en-US'),
        isEditing: false
      },
      {
        id: 6,
        material: 'Carbon Steel',
        thickness: '1.2',
        grade: 'A36',
        status: 'Inactive',
        created: lastWeek.toLocaleDateString('en-US'),
        modified: lastWeek.toLocaleDateString('en-US'),
        isEditing: false
      }
    ];
  };

  useEffect(() => {
    loadMaterialData();
  }, []);

  const loadMaterialData = async () => {
    try {
      console.log('Loading material data...');
      
      // Check if data exists in localStorage
      const savedData = localStorage.getItem('materialData');
      if (savedData) {
        console.log('Loading saved material data from localStorage');
        setMaterialData(JSON.parse(savedData));
      } else {
        console.log('No saved data found, generating default material data');
        const materialData = generateMaterialData();
        setMaterialData(materialData);
        // Save to localStorage for persistence
        localStorage.setItem('materialData', JSON.stringify(materialData));
      }
    } catch (error) {
      console.error('Error loading material data:', error);
      toast.error('Failed to load material data');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    }
  };

  // Common function to process files
  const processFiles = (files) => {
    toast.success(`${files.length} file(s) uploaded successfully`);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const handleEdit = (row) => {
    setEditingRow(row.id);
    setEditData({
      material: row.material,
      thickness: row.thickness,
      grade: row.grade,
      pricePerKg: row.pricePerKg,
      status: row.status
    });
  };

  const handleSave = async (id) => {
    setLoading(true);
    try {
      console.log('Updating material data and saving to localStorage');
      
      const updatedData = materialData.map(item => 
        item.id === id 
          ? { 
              ...item, 
              material: editData.material, 
              thickness: editData.thickness,
              grade: editData.grade,
              pricePerKg: parseFloat(editData.pricePerKg),
              status: editData.status,
              modified: new Date().toLocaleDateString('en-US'),
              isEditing: false
            }
          : item
      );
      
      setMaterialData(updatedData);
      
      // Save to localStorage for persistence
      localStorage.setItem('materialData', JSON.stringify(updatedData));
      
      setEditingRow(null);
      setEditData({});
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Error saving material data:', error);
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (id) => {
    setEditingRow(null);
    setEditData({});
    setMaterialData(prevData => 
      prevData.map(item => 
        item.id === id 
          ? { ...item, isEditing: false }
          : item
      )
    );
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      const updatedData = materialData.filter(item => item.id !== id);
      setMaterialData(updatedData);
      
      // Save to localStorage for persistence
      localStorage.setItem('materialData', JSON.stringify(updatedData));
      
      toast.success('Item deleted successfully');
    }
  };

  const handleAddNew = () => {
    setShowAddModal(true);
    setNewMaterial({
      material: '',
      thickness: '',
      grade: '',
      status: 'Active'
    });
  };

  const handleAddMaterial = () => {
    if (!newMaterial.material || !newMaterial.thickness || !newMaterial.grade) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newId = Math.max(...materialData.map(item => item.id), 0) + 1;
    const today = new Date();
    
    const materialToAdd = {
      id: newId,
      material: newMaterial.material,
      thickness: newMaterial.thickness,
      grade: newMaterial.grade,
      status: newMaterial.status,
      created: today.toLocaleDateString('en-US'),
      modified: today.toLocaleDateString('en-US'),
      isEditing: false
    };

    const updatedData = [...materialData, materialToAdd];
    setMaterialData(updatedData);
    
    // Save to localStorage for persistence
    localStorage.setItem('materialData', JSON.stringify(updatedData));
    
    setShowAddModal(false);
    setNewMaterial({
      material: '',
      thickness: '',
      grade: '',
      status: 'Active'
    });
    toast.success('New material added successfully');
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setNewMaterial({
      material: '',
      thickness: '',
      grade: '',
      status: 'Active'
    });
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      console.log('Saving all material data to localStorage');
      
      // Save current state to localStorage
      localStorage.setItem('materialData', JSON.stringify(materialData));
      
      toast.success('All changes saved successfully');
    } catch (error) {
      console.error('Error saving material data:', error);
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const materialOptions = ['Zintec', 'Stainless Steel', 'Aluminum', 'Mild Steel', 'Galvanized Steel'];
  const thicknessOptions = ['0.5', '1.0', '1.5', '2.0', '2.5', '3.0', '4.0', '5.0'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">CUTBEND</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">A</span>
                </div>
                <span className="text-sm text-gray-700">Admin User</span>
                <span className="text-sm text-gray-500">Back Office</span>
              </div>
            </div>
          </div> */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Material & Thickness Data Managements
          </h1>
          <p className="text-gray-600">
            Manage material specifications and thickness data for orders
          </p>
        </div>

        {/* New Estimate Input */}
        {/* <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">New Estimate:</label>
            <input
              type="text"
              value={newEstimate}
              onChange={(e) => setNewEstimate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              placeholder="Enter estimate number"
            />
          </div>
        </div> */}

        {/* File Upload Section */}
        {/* <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div
            className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center relative ${
              dragActive ? 'border-green-500 bg-green-50' : ''
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <input
              id="file-upload"
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="text-4xl mb-4">📁</div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              DRAG AND DROP HERE OR CLICK TO CHOOSE FILES
            </p>
          </div>
        </div> */}

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Material & Thickness Data</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">{materialData.length} items</span>
                <button
                  onClick={handleAddNew}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  + Add New Material
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="max-h-96 overflow-y-auto" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db #f3f4f6'
            }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thickness
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {materialData.length > 0 ? (
                  materialData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                          {editingRow === item.id ? (
                            <select
                              value={editData.material}
                              onChange={(e) => setEditData({...editData, material: e.target.value})}
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {materialOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : (
                            item.material
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingRow === item.id ? (
                          <select
                            value={editData.thickness}
                            onChange={(e) => setEditData({...editData, thickness: e.target.value})}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {thicknessOptions.map(option => (
                              <option key={option} value={option}>{option}mm</option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {item.thickness}mm
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingRow === item.id ? (
                          <input
                            type="text"
                            value={editData.grade}
                            onChange={(e) => setEditData({...editData, grade: e.target.value})}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            {item.grade}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingRow === item.id ? (
                          <select
                            value={editData.status}
                            onChange={(e) => setEditData({...editData, status: e.target.value})}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {editingRow === item.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSave(item.id)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => handleCancel(item.id)}
                              className="px-3 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="text-4xl mb-4">📋</div>
                      <p className="text-lg font-medium">No material data found</p>
                      <p className="text-sm">Add materials to get started</p>
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={handleSaveAll}
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'SAVE ALL'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Material</h3>
                <button
                  onClick={handleCancelAdd}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
                  <input
                    type="text"
                    value={newMaterial.material}
                    onChange={(e) => setNewMaterial({...newMaterial, material: e.target.value})}
                    placeholder="Enter material name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thickness *</label>
                  <select
                    value={newMaterial.thickness}
                    onChange={(e) => setNewMaterial({...newMaterial, thickness: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Thickness</option>
                    {thicknessOptions.map(option => (
                      <option key={option} value={option}>{option}mm</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                  <input
                    type="text"
                    value={newMaterial.grade}
                    onChange={(e) => setNewMaterial({...newMaterial, grade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter grade (e.g., S275, IS2062)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newMaterial.status}
                    onChange={(e) => setNewMaterial({...newMaterial, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelAdd}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMaterial}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Material
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackOfficeMaterialManagement;