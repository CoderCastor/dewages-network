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
import CompanySignupForm from "./pages/CompanySignupForm";
import WorkerSigninPage from "./pages/WorkerSigninPage";
import CompanySigninPage from "./pages/CompanySigninPage";
import CompanyDashboard from "./pages/CompanyDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import CompanyDetailPage from "./pages/admin/CompanyDetails";
import WorkerProfilePage from "./pages/WorkerProfilePage";
import CompanyProfilePage from "./pages/CompanyProfilePage";
import EducatePage from "./pages/EducatePage";


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
    path: "/worker/signin",
    Component: WorkerSigninPage,
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
  {
    path: "/company/signup",
    Component: CompanySignupForm,
  },
  {
    path: "/company/signin",
    Component: CompanySigninPage,
  },
  {
    path: "/company/dashboard",
    Component: CompanyDashboard,
  },
  {
    path: "/worker/dashboard",
    Component: WorkerDashboard,
  },
  {
    path: "/admin/company/:walletAddress",
    Component: CompanyDetailPage,
  },
  {
    path: "/worker/profile",
    Component: WorkerProfilePage,
  },
  {
    path: "/company/profile",
    Component: CompanyProfilePage,
  },
  {
    path: "/learn",
    Component: EducatePage,
  },
]);

