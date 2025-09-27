import { createBrowserRouter } from "react-router";
import Home from "./pages/LandingPage";
import App from "./App";
import WorkerSignupForm from "./pages/WorkerSignup";
import WorkerJobPage from "./pages/WorkerJobPage";
import CompanyJobPostingPage from "./pages/CompanyJobPostingPage";


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
]);
