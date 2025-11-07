import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Download, Search, Filter, ArrowLeft } from "lucide-react";
import { wsClient } from "@/lib/wsClient";
import { useToast } from "@/hooks/use-toast";
import type { FIXMessage } from "@shared/schema";

export default function MessageLogsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<FIXMessage[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  const username = localStorage.getItem("fixlab_username") || "User";
  const sessionId = localStorage.getItem("fixlab_session_id") || "";
  const sessionName = localStorage.getItem("fixlab_session_name") || "Session";
  const role = (localStorage.getItem("fixlab_role") || "Trader") as "Trader" | "Broker" | "Custodian";

  useEffect(() => {
    if (!localStorage.getItem("fixlab_username") || !sessionId) {
      setLocation("/");
      return;
    }

    // Connect to WebSocket
    wsClient.connect(sessionId, role, username, sessionName);

    // Set up event handlers
    wsClient.on("session.joined", (data) => {
      setConnected(true);
      setMessages(data.messages || []);
      toast({
        title: "Connected",
        description: "Successfully joined session",
      });
    });

    wsClient.on("message.new", (msgData) => {
      const message: FIXMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sessionId: sessionName,
        direction: msgData.direction,
        messageType: msgData.messageType,
        rawFix: msgData.rawFix,
        parsed: msgData.parsed,
        timestamp: Date.now(),
        fromRole: msgData.fromRole,
        toRole: msgData.toRole,
      };
      setMessages((prev) => [message, ...prev]);
    });

    wsClient.on("error", (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    });

    return () => {
      wsClient.disconnect();
    };
  }, [sessionName, username, setLocation, toast, role]);

  const handleLogout = () => {
    localStorage.removeItem("fixlab_username");
    localStorage.removeItem("fixlab_session_id");
    localStorage.removeItem("fixlab_session_name");
    localStorage.removeItem("fixlab_role");
    wsClient.disconnect();
    setLocation("/");
  };

  const handleBackToDashboard = () => {
    const dashboardRoutes = {
      Trader: "/trader",
      Broker: "/broker",
      Custodian: "/custodian",
    };
    setLocation(dashboardRoutes[role]);
  };

  const handleExport = () => {
    const exportData = messages.map(msg => ({
      timestamp: new Date(msg.timestamp || Date.now()).toISOString(),
      direction: msg.direction,
      messageType: msg.messageType,
      from: msg.fromRole,
      to: msg.toRole,
      rawFix: msg.rawFix,
      parsed: msg.parsed,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fixlab-messages-${sessionName}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Messages Exported",
      description: `Exported ${messages.length} messages`,
    });
  };

  const filteredMessages = messages.filter(msg => {
    if (filterType !== "all" && msg.messageType !== filterType) return false;
    if (filterDirection !== "all" && msg.direction !== filterDirection) return false;
    if (searchText && !msg.rawFix.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const messageTypeLabels: Record<string, string> = {
    "D": "New Order",
    "8": "Execution Report",
    "F": "Cancel Request",
    "G": "Replace Request",
    "J": "Allocation Instruction",
    "AS": "Allocation Report",
    "AK": "Confirmation",
    "P": "Allocation Ack",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">FIX Message Logs</h1>
              <p className="text-sm text-muted-foreground">
                Session: {sessionName} • {username} ({role})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToDashboard}
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Badge variant={connected ? "default" : "secondary"} data-testid="status-connection">
                {connected ? "Connected" : "Disconnected"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={messages.length === 0}
                data-testid="button-export-messages"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Message Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger data-testid="select-message-type-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="D">New Order (D)</SelectItem>
                    <SelectItem value="8">Execution Report (8)</SelectItem>
                    <SelectItem value="F">Cancel Request (F)</SelectItem>
                    <SelectItem value="G">Replace Request (G)</SelectItem>
                    <SelectItem value="J">Allocation (J)</SelectItem>
                    <SelectItem value="AS">Allocation Report (AS)</SelectItem>
                    <SelectItem value="AK">Confirmation (AK)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Direction</label>
                <Select value={filterDirection} onValueChange={setFilterDirection}>
                  <SelectTrigger data-testid="select-direction-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Directions</SelectItem>
                    <SelectItem value="Incoming">Incoming</SelectItem>
                    <SelectItem value="Outgoing">Outgoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="input-search-messages"
                    placeholder="Search messages..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredMessages.length} of {messages.length} messages
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <Card>
          <CardHeader>
            <CardTitle>Messages ({filteredMessages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {messages.length === 0 ? "No messages yet" : "No messages match the current filters"}
                </div>
              ) : (
                filteredMessages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className="border rounded-lg p-4 hover-elevate active-elevate-2"
                    data-testid={`message-${index}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={msg.direction === "Incoming" ? "default" : "secondary"}
                          data-testid={`badge-direction-${index}`}
                        >
                          {msg.direction}
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-type-${index}`}>
                          {messageTypeLabels[msg.messageType] || msg.messageType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {msg.fromRole} → {msg.toRole}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground" data-testid={`timestamp-${index}`}>
                        {new Date(msg.timestamp || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-muted rounded p-3 font-mono text-xs overflow-x-auto">
                      <div className="whitespace-pre-wrap break-all" data-testid={`raw-fix-${index}`}>
                        {msg.rawFix.replace(/\x01/g, '|')}
                      </div>
                    </div>
                    {msg.parsed && typeof msg.parsed === 'object' && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View Parsed Tags
                        </summary>
                        <div className="mt-2 bg-muted rounded p-3 font-mono text-xs">
                          <pre data-testid={`parsed-tags-${index}`}>
                            {JSON.stringify(msg.parsed, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                ))
              )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
