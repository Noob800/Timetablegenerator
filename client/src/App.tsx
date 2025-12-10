import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Generate from "@/pages/Generate";
import ScheduleView from "@/pages/ScheduleView";
import Settings from "@/pages/Settings";
import UnitOverrides from "@/pages/UnitOverrides";
import ConflictResolution from "@/pages/ConflictResolution";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/generate" component={Generate} />
      <Route path="/schedule/:type" component={ScheduleView} />
      <Route path="/conflicts" component={ConflictResolution} />
      <Route path="/settings" component={Settings} />
      <Route path="/unit-overrides" component={UnitOverrides} />
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
