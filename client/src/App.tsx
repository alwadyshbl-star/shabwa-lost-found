import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import CreateReport from "./pages/CreateReport";
import EditReport from "./pages/EditReport";
import Home from "./pages/Home";
import MyReports from "./pages/MyReports";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import ReportDetails from "./pages/ReportDetails";
import SearchReports from "./pages/SearchReports";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/auth" component={Auth} /><Route path="/search" component={SearchReports} /><Route path="/reports/new" component={CreateReport} /><Route path="/reports/:id/edit" component={EditReport} /><Route path="/reports/:id" component={ReportDetails} /><Route path="/my-reports" component={MyReports} /><Route path="/notifications" component={Notifications} /><Route path="/admin" component={AdminDashboard} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-center" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
