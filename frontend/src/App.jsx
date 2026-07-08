import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import StoreLayout from './layouts/StoreLayout';
import Home from './pages/Store/Home/Home';
import Checkout from './pages/Store/Checkout/Checkout';
import Cart from './pages/Store/Cart/Cart';
import Shop from './pages/Store/Shop/Shop';
import Contact from './pages/Store/Contact/Contact';
import ProductDetails from './pages/Store/ProductDetails/ProductDetails';
import StoreCategories from './pages/Store/Categories/Categories';
import Login from './pages/Admin/Login/Login';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Admin/Dashboard/Dashboard';
import Orders from './pages/Admin/Orders/Orders';
import Customers from './pages/Admin/Customers/Customers';
import Complaints from './pages/Admin/Complaints/Complaints';
import Inventory from './pages/Admin/Inventory/Inventory';
import Products from './pages/Admin/Products/Products';
import AdminCategories from './pages/Admin/Categories/Categories';
import Users from './pages/Admin/Users/Users';
import Statistics from './pages/Admin/Statistics/Statistics';
import DeliveryPricing from './pages/Admin/DeliveryPricing/DeliveryPricing';
import AdminOffers from './pages/Admin/Offers/Offers';
import StoreOffers from './pages/Store/Offers/Offers';
import MyOrders from './pages/Store/MyOrders/MyOrders';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Storefront Routes */}
            <Route path="/" element={<StoreLayout />}>
              <Route index element={<Home />} />
              <Route path="shop" element={<Shop />} />
              <Route path="categories" element={<StoreCategories />} />
              <Route path="contact" element={<Contact />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="cart" element={<Cart />} />
              <Route path="offers" element={<StoreOffers />} />
              <Route path="product/:id" element={<ProductDetails />} />
              <Route path="my-orders" element={<MyOrders />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="orders" element={<Orders />} />
              <Route path="products" element={<Products />} />
              <Route path="offers" element={<AdminOffers />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="customers" element={<Customers />} />
              <Route path="delivery-pricing" element={<DeliveryPricing />} />
              <Route path="complaints" element={<Complaints />} />
              <Route path="users" element={<Users />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
