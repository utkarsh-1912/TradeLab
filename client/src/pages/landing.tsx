import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TrendingUp, Building2, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ParticipantRole, Session } from "@shared/schema";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>("Trader");
  const [sessionName, setSessionName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinSession = async () => {
    if (!username.trim()) return;

    setIsLoading(true);

    try {
      const name = sessionName.trim() || "default-session";

      const sessionsResponse = await apiRequest("GET", "/api/sessions");
      const sessions: Session[] = await sessionsResponse.json();

      let session = sessions.find(s => s.name === name && s.status === "active");

      if (!session) {
        const createResponse = await apiRequest("POST", "/api/sessions", { name });
        session = await createResponse.json();

        toast({
          title: "Session Created",
          description: `Created new session: ${name}`,
        });
      } else {
        toast({
          title: "Session Joined",
          description: `Joined existing session: ${name}`,
        });
      }

      localStorage.setItem("fixlab_username", username);
      localStorage.setItem("fixlab_role", selectedRole);
      localStorage.setItem("fixlab_session_id", session.id);
      localStorage.setItem("fixlab_session_name", session.name);

      if (selectedRole === "Trader") setLocation("/trader");
      else if (selectedRole === "Broker") setLocation("/broker");
      else setLocation("/custodian");
    } catch (error) {
      console.error("Failed to join session:", error);
      toast({
        title: "Connection Error",
        description: "Failed to create or join session. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const roleOptions = [
    {
      value: "Trader" as ParticipantRole,
      icon: TrendingUp,
      title: "Trader",
      description: "Place orders, manage executions, and create allocations"
    },
    {
      value: "Broker" as ParticipantRole,
      icon: Building2,
      title: "Broker",
      description: "Process orders, generate executions, and handle allocations"
    },
    {
      value: "Custodian" as ParticipantRole,
      icon: Shield,
      title: "Custodian",
      description: "Confirm allocations and complete three-way matching"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      {/* Navbar */}
      <header className="w-full py-4 bg-white shadow-sm flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="FixLab Logo" className="h-8 w-8" />
          <span className="font-bold text-xl tracking-tight">TradeLab</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-lg border-0 rounded-xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Trade Simulator</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Browser-based integrated FIX simulator for trading with complete allocation workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-10"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session" className="text-sm font-medium">
                Session Name
              </Label>
              <Input
                id="session"
                data-testid="input-session"
                type="text"
                placeholder="Enter session name to join or create"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="h-10"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Multiple users can join the same session by using the same session name
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Your Role</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as ParticipantRole)}
                disabled={isLoading}
              >
                <div className="grid grid-cols-1 gap-3">
                  {roleOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <div key={option.value} className="relative">
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                          className="peer sr-only"
                          data-testid={`radio-role-${option.value.toLowerCase()}`}
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor={option.value}
                          className="flex items-start gap-4 rounded-lg border-2 border-border bg-card p-4 cursor-pointer hover:shadow-md peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed transition"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold">{option.title}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            <Button
              data-testid="button-join-session"
              onClick={handleJoinSession}
              disabled={!username.trim() || isLoading}
              className="w-full h-10"
              size="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining Session...
                </>
              ) : (
                "Join Session"
              )}
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 bg-white shadow-inner text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <img src="/favicon.png" alt="FixLab Logo" className="h-5 w-5" />
          <span>TradeLab © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
