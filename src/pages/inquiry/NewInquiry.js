import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { inquiryAPI, handleApiError, handleApiSuccess } from '../../services/api';
import toast from 'react-hot-toast';
import PDFFileTable from '../../components/PDFFileTable';
import UserInfoDisplay from '../../components/UserInfoDisplay';

const NewInquiry = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quantity: '',
    material: '',
    thickness: '',
    grade: '',
    remark: '',
    files: []
  });
  const [pdfFiles, setPdfFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
      const validFiles = files.filter(file => {
        const extension = file.name.split('.').pop().toLowerCase();
        return ['dwg', 'dxf', 'zip', 'pdf'].includes(extension);
      });
      
      if (validFiles.length !== files.length) {
        toast.error('Only DWG, DXF, ZIP, and PDF files are allowed');
      }
      
      // Process ALL files for the table
      const processedFiles = validFiles.map((file, index) => ({
        id: `file_${Date.now()}_${index}`,
        name: file.name,
        partRef: file.name,
        material: 'Zintec',
        thickness: '1.5',
        grade: '',
        quantity: 1,
        createdAt: new Date().toISOString(),
        file: file,
        fileType: file.name.split('.').pop().toLowerCase()
      }));
      
      setPdfFiles(prev => {
        const newFiles = [...prev, ...processedFiles];
        console.log('Files dropped:', processedFiles);
        console.log('Previous files:', prev);
        console.log('New total files:', newFiles.length);
        return newFiles;
      });
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return ['dwg', 'dxf', 'zip', 'pdf'].includes(extension);
    });
    
    if (validFiles.length !== files.length) {
      toast.error('Only DWG, DXF, ZIP, and PDF files are allowed');
    }
    
    // Process ALL files for the table (not just PDFs)
    const processedFiles = validFiles.map((file, index) => ({
      id: `file_${Date.now()}_${index}`,
      name: file.name,
      partRef: file.name,
      material: 'Zintec',
      thickness: '1.5',
      grade: 'Grade A',
      remark: 'No remarks',
      quantity: 1,
      createdAt: new Date().toISOString(),
      file: file,
      fileType: file.name.split('.').pop().toLowerCase()
    }));
    
    setPdfFiles(prev => {
      const newFiles = [...prev, ...processedFiles];
      console.log('Files uploaded:', processedFiles);
      console.log('Previous files:', prev);
      console.log('New total files:', newFiles.length);
      return newFiles;
    });
  };

  const removeFile = (index) => {
    setFormData({
      ...formData,
      files: formData.files.filter((_, i) => i !== index)
    });
  };

  const handleUpdatePdfFile = (fileId, updatedData) => {
    setPdfFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, ...updatedData, updatedAt: new Date().toISOString() }
          : file
      )
    );
    toast.success('File updated successfully');
  };

  const handleDeletePdfFile = (fileId) => {
    setPdfFiles(prev => prev.filter(file => file.id !== fileId));
    toast.success('File deleted successfully');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (pdfFiles.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }
    
    setLoading(true);

    try {
      // Use files from the table for submission
      const allFiles = pdfFiles.map(file => file.file);
      const submissionData = {
        ...formData,
        files: allFiles,
        fileMetadata: pdfFiles // Include file metadata separately
      };
      
      const result = await inquiryAPI.createInquiry(submissionData);
      const response = handleApiSuccess(result);
      
      toast.success(response.message || 'Inquiry submitted successfully!');
      navigate('/inquiries');
    } catch (error) {
      const errorResponse = handleApiError(error);
      toast.error(errorResponse.error || 'Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <span className="ml-2 text-lg font-bold text-gray-900 hover:text-green-600 transition-colors duration-200">CUTBEND</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Link 
                  to="/inquiry/new" 
                  className="px-3 py-1 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 transition-colors duration-200"
                >
                  New Inquiry
                </Link>
                <Link 
                  to="/inquiry/new" 
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-300 transition-colors duration-200"
                >
                  Upload Drawing
                </Link>
              </div>
              
              <div className="flex items-center space-x-4">
                <select className="text-sm border-none bg-transparent focus:outline-none">
                  <option>English</option>
                </select>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                      {user?.lastName?.charAt(0)?.toUpperCase() || 'S'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.email || 'User'
                      }
                    </span>
                    <span className="text-xs text-gray-500">
                      {user?.companyName || 'Company'}
                    </span>
                  </div>
                </div>
                <Link 
                  to="/orders" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                >
                  ORDER
                </Link>
                <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option>Location</option>
                  <option>Mumbai</option>
                  <option>Delhi</option>
                  <option>Bangalore</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-2 ">
        <div className="flex gap-3">
          {/* Left Sidebar */}
          <div className="w-64 bg-white rounded-lg shadow p-2">
            <button className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium mb-1">
              New Inquiry
            </button>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">SHOP HARDWARE</span>
                <span className="text-gray-400">▼</span>
              </div>
              
              <div className="space-y-2">
                <Link 
                  to="/inquiries" 
                  className="flex items-center space-x-3 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 px-2 py-1 rounded transition-colors duration-200"
                >
                  <span>⚠️</span>
                  <span>RFQs</span>
                </Link>
                <Link 
                  to="/orders" 
                  className="flex items-center space-x-3 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 px-2 py-1 rounded transition-colors duration-200"
                >
                  <span>📦</span>
                  <span>My Orders</span>
                </Link>
                <Link 
                  to="/parts" 
                  className="flex items-center space-x-3 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 px-2 py-1 rounded transition-colors duration-200"
                >
                  <span>🔧</span>
                  <span>My Parts</span>
                </Link>
                <Link 
                  to="/tools" 
                  className="flex items-center space-x-3 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 px-2 py-1 rounded transition-colors duration-200"
                >
                  <span>⚙️</span>
                  <span>Engineering Tools</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Left Column - File Upload (Wider) */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-2">
                <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-lg p-8 text-center min-h-[300px] flex flex-col justify-center">
                  <div
                    className={`relative flex flex-col items-center justify-center h-full ${dragActive ? 'bg-green-100' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".dwg,.dxf,.zip,.pdf"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-6xl mb-1 text-green-400"></div>
                    <p className="text-xl font-medium text-gray-700 mb-1">
                      Drag files to upload or
                    </p>
                    <button
                      type="button"
                      className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-green-700 transition-colors duration-200 shadow-lg"
                    >
                      BROWSE
                    </button>
                    <p className="text-sm text-gray-500 mt-4">
                      Allowed extensions: dwg, dxf, zip, pdf
                    </p>
                  </div>
                </div>
                

                {/* Files Table - Show when files are uploaded */}
                {pdfFiles.length > 0 && (
                  <PDFFileTable 
                    files={pdfFiles}
                    onUpdateFile={handleUpdatePdfFile}
                    onDeleteFile={handleDeletePdfFile}
                  />
                )}

                {/* User Information Display - Always show */}
                <UserInfoDisplay />
                
              </div>

              {/* Right Column - Information Panels */}
              <div className="lg:col-span-1 space-y-3">
                {/* Available Manufacturing Processes */}
                <div className="bg-white rounded-lg shadow p-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center">
                    <span className="mr-2">ℹ️</span>
                    Available Manufacturing Processes
                  </h3>
                  <div className="space-y-1">
                    {[
                      'Laser Cutting',
                      'CNC Bending',
                      'CNC Turning',
                      'Laser Engraving',
                      'Chamfer',
                      'Threading',
                      'Surface Finishing'
                    ].map((process) => (
                      <div key={process} className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span className="text-sm text-gray-700">{process}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Policy */}
                <div className="bg-white rounded-lg shadow p-2">
                  <h4 className="text-lg font-semibold text-gray-800 mb-1 flex items-center">
                    <span className="mr-2">ℹ️</span>
                    Content Policy Agreement
                  </h4>
                  <p className="text-sm text-gray-600 mb-1">
                    By uploading your file, you agree and acknowledge and ratify the technical drawings are respecting K.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Illegal, false or offensive parts',
                      'Weapons or military parts',
                      'Export controlled parts',
                      'Intellectual property infringement'
                    ].map((item) => (
                      <div key={item} className="flex items-center text-sm text-red-600">
                        <span className="mr-2">✗</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Material and Thickness Input */}
            <div className="mt-8 bg-white rounded-lg shadow p-3">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material, Thickness, Grade, Required Quantity, for each file. With Remark.
                  </label>
                  <textarea
                    name="remark"
                    value={formData.remark}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter material specifications, thickness, grade, quantity, and any remarks for each file..."
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || pdfFiles.length === 0}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Inquiry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    // </div>
  );
};

export default NewInquiry;
