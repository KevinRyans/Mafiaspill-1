import { Navigate, Route, Routes } from "react-router-dom"
import { getAccessToken, getRole } from "./lib/auth"
import Dashboard from "./pages/Dashboard"
import Missions from "./pages/Missions"
import Market from "./pages/Market"
import Inventory from "./pages/Inventory"
import Crew from "./pages/Crew"
import Combat from "./pages/Combat"
import Login from "./pages/Login"
import Register from "./pages/Register"
import AdminDashboard from "./pages/admin/AdminDashboard"
import Notifications from "./pages/Notifications"
import Contacts from "./pages/Contacts"
import World from "./pages/World"
import Passive from "./pages/Passive"
import Profile from "./pages/Profile"
import Travel from "./pages/Travel"
import Gambling from "./pages/Gambling"
import Darknet from "./pages/Darknet"
import Prison from "./pages/Prison"
import Respect from "./pages/Respect"
import Crime from "./pages/Crime"
import CarTheft from "./pages/CarTheft"
import HouseRobbery from "./pages/HouseRobbery"
import PlayerRobbery from "./pages/PlayerRobbery"
import FightClub from "./pages/FightClub"
import OrganizedCrime from "./pages/OrganizedCrime"
import Businesses from "./pages/Businesses"
import Utf8Test from "./pages/Utf8Test"
import Bank from "./pages/Bank"
import Garage from "./pages/Garage"

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = getAccessToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const role = getRole()
  if (!role || !["admin", "mod", "support"].includes(role)) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  const adminPath = `/${import.meta.env.VITE_ADMIN_ROUTE}`

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route path="/missions" element={<RequireAuth><Missions /></RequireAuth>} />
      <Route path="/crime" element={<RequireAuth><Crime /></RequireAuth>} />
      <Route path="/car-theft" element={<RequireAuth><CarTheft /></RequireAuth>} />
      <Route path="/house-robbery" element={<RequireAuth><HouseRobbery /></RequireAuth>} />
      <Route path="/player-robbery" element={<RequireAuth><PlayerRobbery /></RequireAuth>} />
      <Route path="/fight-club" element={<RequireAuth><FightClub /></RequireAuth>} />
      <Route path="/organized" element={<RequireAuth><OrganizedCrime /></RequireAuth>} />
      <Route path="/market" element={<RequireAuth><Market /></RequireAuth>} />
      <Route path="/respect" element={<RequireAuth><Respect /></RequireAuth>} />
      <Route path="/businesses" element={<RequireAuth><Businesses /></RequireAuth>} />
      <Route path="/bank" element={<RequireAuth><Bank /></RequireAuth>} />
      <Route path="/garage" element={<RequireAuth><Garage /></RequireAuth>} />
      <Route path="/passive" element={<RequireAuth><Passive /></RequireAuth>} />
      <Route path="/contacts" element={<RequireAuth><Contacts /></RequireAuth>} />
      <Route path="/world" element={<RequireAuth><World /></RequireAuth>} />
      <Route path="/travel" element={<RequireAuth><Travel /></RequireAuth>} />
      <Route path="/gambling" element={<RequireAuth><Gambling /></RequireAuth>} />
      <Route path="/darknet" element={<RequireAuth><Darknet /></RequireAuth>} />
      <Route path="/prison" element={<RequireAuth><Prison /></RequireAuth>} />
      <Route path="/inventory" element={<RequireAuth><Inventory /></RequireAuth>} />
      <Route path="/crew" element={<RequireAuth><Crew /></RequireAuth>} />
      <Route path="/combat" element={<RequireAuth><Combat /></RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/utf8-test" element={<RequireAuth><Utf8Test /></RequireAuth>} />
      <Route
        path={adminPath}
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
