import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function ErrorPage() {
  const [, setLocation] = useLocation();
  
  // Try to get error from URL params or localStorage
  const error: Error | null = null; // Can be extended to read from URL params
  const resetError = () => {
    // Clear any error state
    window.location.href = "/";
  };

  const handleGoHome = () => {
    if (resetError) {
      resetError();
    }
    setLocation("/");
  };

  const handleGoBack = () => {
    if (resetError) {
      resetError();
    }
    window.history.back();
  };

  const handleRefresh = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                An unexpected error occurred in the application
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    {error.name || "Error"}
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200 font-mono break-words">
                    {error.message || "An unknown error occurred"}
                  </p>
                  {process.env.NODE_ENV === "development" && error.stack && (
                    <details className="mt-3">
                      <summary className="text-xs text-red-700 dark:text-red-300 cursor-pointer hover:underline">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto max-h-48 p-2 bg-red-100 dark:bg-red-950/40 rounded">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {!error && (
            <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                An unexpected error occurred. Please try refreshing the page or navigating back.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleRefresh}
              variant="default"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t">
            <p>
              If this problem persists, please check your browser console for more details
              or contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

