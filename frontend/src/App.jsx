import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { RequireRole } from './auth/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Notifications from './pages/Notifications';
import Bookings from './pages/Bookings';
import BookingDetail from './pages/BookingDetail';
import Complaints from './pages/Complaints';
import NotFound from './pages/NotFound';
import HouseholdProfile from './pages/household/HouseholdProfile';
import Browse from './pages/household/Browse';
import HelperDetail from './pages/household/HelperDetail';
import HelperDashboard from './pages/helper/HelperDashboard';
import HelperProfile from './pages/helper/HelperProfile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminHelpers from './pages/admin/AdminHelpers';
import AdminHelperDetail from './pages/admin/AdminHelperDetail';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminBookings from './pages/admin/AdminBookings';
import AdminComplaints from './pages/admin/AdminComplaints';

const guard = (roles, el) => <RequireRole roles={roles}>{el}</RequireRole>;
const ANY = ['household', 'helper', 'admin'];

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/notifications" element={guard(ANY, <Notifications />)} />
        <Route path="/bookings" element={guard(['household', 'helper'], <Bookings />)} />
        <Route path="/bookings/:id" element={guard(ANY, <BookingDetail />)} />
        <Route path="/complaints" element={guard(['household', 'helper'], <Complaints />)} />

        <Route path="/household/profile" element={guard(['household'], <HouseholdProfile />)} />
        <Route path="/browse" element={guard(['household', 'admin'], <Browse />)} />
        <Route path="/browse/:id" element={guard(['household', 'admin'], <HelperDetail />)} />

        <Route path="/helper/dashboard" element={guard(['helper'], <HelperDashboard />)} />
        <Route path="/helper/profile" element={guard(['helper'], <HelperProfile />)} />

        <Route path="/admin" element={guard(['admin'], <AdminDashboard />)} />
        <Route path="/admin/helpers" element={guard(['admin'], <AdminHelpers />)} />
        <Route path="/admin/helpers/:id" element={guard(['admin'], <AdminHelperDetail />)} />
        <Route path="/admin/users" element={guard(['admin'], <AdminUsers />)} />
        <Route path="/admin/categories" element={guard(['admin'], <AdminCategories />)} />
        <Route path="/admin/bookings" element={guard(['admin'], <AdminBookings />)} />
        <Route path="/admin/complaints" element={guard(['admin'], <AdminComplaints />)} />

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
