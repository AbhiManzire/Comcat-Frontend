import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI, adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [dispatchData, setDispatchData] = useState({
    courier: '',
    trackingNumber: '',
    estimatedDelivery: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);


  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('Fetching orders from API...'); // Debug log
      const response = await adminAPI.getAllOrders();
      console.log('API Response:', response); // Debug log
      
      if (response.data.success) {
        console.log('Fetched orders:', response.data.orders);
        const transformedOrders = response.data.orders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'N/A',
          title: `Order for ${order.parts?.length || 0} parts`,
          status: order.status,
          amount: order.totalAmount,
          createdAt: new Date(order.createdAt).toISOString().split('T')[0],
          expectedDelivery: order.production?.estimatedCompletion ? 
            new Date(order.production.estimatedCompletion).toISOString().split('T')[0] : 'TBD',
          // Keep full order data for actions
          _id: order._id,
          customer: order.customer,
          parts: order.parts,
          payment: order.payment,
          dispatch: order.dispatch
        }));
        console.log('Transformed orders:', transformedOrders);
        setOrders(transformedOrders);
      } else {
        toast.error(response.data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Handler for setting delivery time (Point 5)
  const handleSetDeliveryTime = (order) => {
    setSelectedOrder(order);
    setDeliveryTime('');
    setShowDeliveryModal(true);
  };

  const handleSubmitDeliveryTime = async () => {
    if (!deliveryTime) {
      toast.error('Please select delivery time');
      return;
    }

    try {
      console.log('Setting delivery time with data:', {
        orderId: selectedOrder._id,
        deliveryTime: deliveryTime
      });
      
      const response = await adminAPI.updateOrderStatus(selectedOrder._id, 'in_production', {
        estimatedDelivery: deliveryTime,
        notes: 'Production started with estimated delivery time'
      });
      console.log('Delivery time response:', response);

      if (response.data.success) {
        toast.success('Delivery time set and customer notified');
        setShowDeliveryModal(false);
        fetchOrders(); // Refresh orders
      } else {
        toast.error(response.data.message || 'Failed to set delivery time');
      }
    } catch (error) {
      console.error('Error setting delivery time:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to set delivery time');
    }
  };

  // Handler for marking order ready for dispatch
  const handleMarkReadyForDispatch = async (order) => {
    try {
      const response = await adminAPI.updateOrderStatus(order._id, 'ready_for_dispatch', {
        notes: 'Order completed and ready for dispatch'
      });

      if (response.data.success) {
        toast.success('Order marked as ready for dispatch');
        fetchOrders(); // Refresh orders
      } else {
        toast.error(response.data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  // Handler for dispatching order (Point 6)
  const handleDispatchOrder = (order) => {
    setSelectedOrder(order);
    setDispatchData({
      courier: '',
      trackingNumber: '',
      estimatedDelivery: ''
    });
    setShowDispatchModal(true);
  };

  const handleSubmitDispatch = async () => {
    if (!dispatchData.courier || !dispatchData.trackingNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      console.log('Dispatching order with data:', {
        orderId: selectedOrder._id,
        dispatchData: dispatchData
      });
      
      const response = await adminAPI.updateDeliveryDetails(selectedOrder._id, dispatchData);
      console.log('Dispatch response:', response);

      if (response.data.success) {
        toast.success('Order dispatched and customer notified');
        setShowDispatchModal(false);
        fetchOrders(); // Refresh orders
      } else {
        toast.error(response.data.message || 'Failed to dispatch order');
      }
    } catch (error) {
      console.error('Error dispatching order:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to dispatch order');
    }
  };

  // Handler for marking order as delivered
  const handleMarkDelivered = async (order) => {
    try {
      const response = await adminAPI.updateOrderStatus(order._id, 'delivered', {
        notes: 'Order delivered successfully'
      });

      if (response.data.success) {
        toast.success('Order marked as delivered');
        fetchOrders(); // Refresh orders
      } else {
        toast.error(response.data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_production':
        return 'bg-purple-100 text-purple-800';
      case 'ready_for_dispatch':
        return 'bg-orange-100 text-orange-800';
      case 'dispatched':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Order Management</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage and track all customer orders.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'pending'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'confirmed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Confirmed
            </button>
            <button
              onClick={() => setFilter('in_production')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'in_production'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Production
            </button>
            <button
              onClick={() => setFilter('ready_for_dispatch')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'ready_for_dispatch'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ready for Dispatch
            </button>
            <button
              onClick={() => setFilter('dispatched')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'dispatched'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Dispatched
            </button>
            <button
              onClick={() => setFilter('delivered')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'delivered'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Delivered
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg max-h-96 overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db #f3f4f6'
              }}>
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expected Delivery
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.orderNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${order.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.expectedDelivery === 'TBD' ? 'TBD' : new Date(order.expectedDelivery).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <Link
                            to={`/order/${order.id}`}
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => console.log('View button clicked for order:', order.id, 'Full order:', order)}
                          >
                            View
                          </Link>
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleSetDeliveryTime(order)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Set Delivery
                              </button>
                              <button
                                onClick={() => handleMarkReadyForDispatch(order)}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                Ready
                              </button>
                            </>
                          )}
                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => handleSetDeliveryTime(order)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Set Delivery
                            </button>
                          )}
                          {order.status === 'in_production' && (
                            <button
                              onClick={() => handleMarkReadyForDispatch(order)}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              Ready
                            </button>
                          )}
                          {order.status === 'ready_for_dispatch' && (
                            <button
                              onClick={() => handleDispatchOrder(order)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Dispatch
                            </button>
                          )}
                          {order.status === 'dispatched' && (
                            <button
                              onClick={() => handleMarkDelivered(order)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Mark Delivered
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No orders found</div>
          </div>
        )}

        {/* Delivery Time Modal */}
        {showDeliveryModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Set Delivery Time - {selectedOrder?.orderNumber}
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Delivery Date
                  </label>
                  <input
                    type="datetime-local"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeliveryModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitDeliveryTime}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Set Delivery Time
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dispatch Modal */}
        {showDispatchModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Dispatch Order - {selectedOrder?.orderNumber}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Courier Name *
                    </label>
                    <input
                      type="text"
                      value={dispatchData.courier}
                      onChange={(e) => setDispatchData({...dispatchData, courier: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., FedEx, UPS, DHL"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking Number *
                    </label>
                    <input
                      type="text"
                      value={dispatchData.trackingNumber}
                      onChange={(e) => setDispatchData({...dispatchData, trackingNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 1Z999AA1234567890"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Delivery Date
                    </label>
                    <input
                      type="datetime-local"
                      value={dispatchData.estimatedDelivery}
                      onChange={(e) => setDispatchData({...dispatchData, estimatedDelivery: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowDispatchModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitDispatch}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Dispatch Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;

