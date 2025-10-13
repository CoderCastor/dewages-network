import { createBrowserRouter } from "react-router";
import Home from "./pages/LandingPage";
// import App from "./App";
import WorkerSignupForm from "./pages/WorkerSignup";
import WorkerJobPage from "./pages/WorkerJobPage";
import CompanyJobPostingPage from "./pages/CompanyJobPostingPage";
import ProfileTestPage from "./pages/ProfileTestPage";
import AdminLogin from "./pages/admin/AdminLogin";
import WorkerDetailPage from "./pages/admin/WorkerDetailPage";
import AdminDashboard from "./pages/admin/AdminDashboard";


export const Router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/worker",
    Component: WorkerJobPage,
  },
  {
    path: "/worker/signup",
    Component: WorkerSignupForm,
  },
  {
    path: "/company",
    Component: CompanyJobPostingPage,
  },
    {
    path: "/test-profile",  // Add this route
    Component: ProfileTestPage,
  },
  {
    path: "/admin/login",
    Component: AdminLogin,
  },
  {
    path: "/admin/dashboard",
    Component: AdminDashboard,
  },
  {
    path: "/admin/worker/:workerId",
    Component: WorkerDetailPage,
  },

]);
