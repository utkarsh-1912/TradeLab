import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import TraderDashboard from "@/pages/trader-dashboard";
import BrokerDashboard from "@/pages/broker-dashboard";
import BrokerOrdersPage from "@/pages/broker-orders-page";
import CustodianDashboard from "@/pages/custodian-dashboard";
import MessageLogsPage from "@/pages/message-logs-page";
import ExecutionsPage from "@/pages/executions-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/trader" component={TraderDashboard} />
      <Route path="/broker" component={BrokerDashboard} />
      <Route path="/broker-orders" component={BrokerOrdersPage} />
      <Route path="/custodian" component={CustodianDashboard} />
      <Route path="/messages" component={MessageLogsPage} />
      <Route path="/executions" component={ExecutionsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
