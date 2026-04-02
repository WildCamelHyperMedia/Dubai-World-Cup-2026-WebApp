import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JourneyProvider } from "./lib/JourneyContext";
import { AnimatePresence, motion } from "framer-motion";
import { Component, type ReactNode, lazy, Suspense } from "react";
import "./lib/i18n";

import Home from "./pages/Home";

const Register = lazy(() => import("./pages/Register"));
const HorseSelect = lazy(() => import("./pages/HorseSelect"));
const JourneyMap = lazy(() => import("./pages/JourneyMap"));
const Station = lazy(() => import("./pages/Station"));
const Capture = lazy(() => import("./pages/Capture"));

const HorseRace = lazy(() => import("./pages/HorseRace"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const NotFound = lazy(() => import("./pages/not-found"));

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const pageTransition = {
  type: "tween" as const,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  duration: 0.3,
};

function PageLoader() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050810]">
      <div className="w-8 h-8 border-2 border-[var(--copper)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AnimatedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="min-h-screen w-full"
    >
      <Component />
    </motion.div>
  );
}

function Router() {
  const [location] = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Switch key={location}>
          <Route path="/">{() => <AnimatedRoute component={Home} />}</Route>
          <Route path="/register">{() => <AnimatedRoute component={Register} />}</Route>
          <Route path="/select-horse">{() => <AnimatedRoute component={HorseSelect} />}</Route>
          <Route path="/journey">{() => <AnimatedRoute component={JourneyMap} />}</Route>
          <Route path="/station/:id">{() => <AnimatedRoute component={Station} />}</Route>
          <Route path="/capture">{() => <AnimatedRoute component={Capture} />}</Route>
          <Route path="/race">{() => <AnimatedRoute component={HorseRace} />}</Route>

          <Route path="/admin" component={AdminDashboard} />
          <Route>{() => <AnimatedRoute component={NotFound} />}</Route>
        </Switch>
      </AnimatePresence>
    </Suspense>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("React error boundary caught:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#050810] text-white p-6 text-center">
          <div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-white/50 mb-4 text-sm">Please refresh the page to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--highlight)] rounded-lg text-sm font-semibold"
              data-testid="button-error-reload"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <JourneyProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
        </JourneyProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
