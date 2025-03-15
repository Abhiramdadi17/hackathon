import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [services, setServices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [newService, setNewService] = useState({ name: "", price: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchCart = () => {
    const token = localStorage.getItem("token");
    axios.get("http://localhost:5000/cart", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => setCart(response.data))
      .catch(() => setError("Failed to load cart."));
  };

  const fetchVendors = () => {
    axios.get("http://localhost:5000/vendors")
      .then((response) => setVendors(response.data))
      .catch(() => setError("Failed to load vendors."));
  };

  const fetchVendorOwnServices = () => {
    const token = localStorage.getItem("token");
    axios.get("http://localhost:5000/vendor-services", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => setServices(response.data))
      .catch(() => setError("Failed to load services."));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    axios.get("http://localhost:5000/protected", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        setUser(response.data.user);
        fetchCart();
        fetchVendors();
        if (response.data.user.role === "vendor") fetchVendorOwnServices();
      })
      .catch(() => {
        setError("Failed to load user data.");
        localStorage.removeItem("token");
        navigate("/");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleAddService = () => {
    const token = localStorage.getItem("token");
    axios.post("http://localhost:5000/add-service", newService, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(() => {
      fetchVendorOwnServices();
      setNewService({ name: "", price: "", description: "" });
    }).catch(() => setError("Failed to add service."));
  };

  const handleAddToCart = (vendorId, service) => {
    const token = localStorage.getItem("token");
    axios.post("http://localhost:5000/cart", {
      vendorId,
      serviceName: service.name,
      price: service.price,
      description: service.description,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(() => fetchCart())
      .catch(() => setError("Failed to add to cart."));
  };

  const handleRemoveFromCart = (serviceId) => {
    const token = localStorage.getItem("token");
    axios.delete(`http://localhost:5000/cart/${serviceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(() => fetchCart())
      .catch(() => setError("Failed to remove from cart."));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  if (error) return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-white shadow-2xl rounded-3xl">
      <h1 className="text-4xl font-bold text-gray-800 transition duration-500">Welcome, {user.name}!</h1>
      <p className="mt-2 text-gray-600">Role: <span className="font-semibold capitalize">{user.role}</span></p>

      {user.role === "vendor" && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Add a New Service</h2>
          <input value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} placeholder="Service Name" className="p-2 border rounded w-full mb-2" />
          <input value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} placeholder="Price" className="p-2 border rounded w-full mb-2" />
          <textarea value={newService.description} onChange={(e) => setNewService({ ...newService, description: e.target.value })} placeholder="Description" className="p-2 border rounded w-full mb-2"></textarea>
          <button onClick={handleAddService} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">Add Service</button>
        </div>
      )}

      {user.role === "customer" && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Available Vendor Services</h2>
          {vendors.map((vendor) => (
            <div key={vendor._id} className="mb-4 p-4 bg-gray-100 rounded shadow">
              <h3 className="text-lg font-semibold">{vendor.name}</h3>
              <ul className="space-y-2">
                {vendor.services && vendor.services.map((service) => (
                  <li key={service._id} className="flex justify-between items-center">
                    <div>
                      <p>{service.name} - ${service.price}</p>
                      <p>{service.description}</p>
                    </div>
                    <button onClick={() => handleAddToCart(vendor._id, service)} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition">Add to Cart</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Cart</h2>
          <ul className="space-y-4">
            {cart.map((item) => (
              <li key={item._id} className="p-4 bg-gray-100 rounded shadow flex justify-between items-center">
                <div>
                  <p>{item.serviceName} - ${item.price}</p>
                  <p>{item.description}</p>
                </div>
                <button onClick={() => handleRemoveFromCart(item._id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition">Remove</button>
              </li>
            ))}
          </ul>
          <p className="text-right mt-4 font-semibold">Total: ${calculateTotal()}</p>
        </div>
      )}

      <button onClick={handleLogout} className="mt-8 w-full bg-red-500 text-white p-3 rounded-full shadow-md hover:shadow-lg hover:bg-red-600 transition duration-300">Logout</button>
    </div>
  );
}
