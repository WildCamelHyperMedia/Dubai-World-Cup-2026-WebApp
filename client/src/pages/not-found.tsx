import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center mesh-bg">
      <Card className="w-full max-w-md mx-4 card-pop gold-border">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-[var(--primary)]" />
            <h1 className="text-2xl font-bold text-[var(--text-main)]">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
