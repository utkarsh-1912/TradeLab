import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Download, Search, Filter, TrendingUp, TrendingDown } from "lucide-react";
import { wsClient } from "@/lib/wsClient";
import { useToast } from "@/hooks/use-toast";
import type { Execution } from "@shared/schema";

export default function ExecutionsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [filterSymbol, setFilterSymbol] = useState("");
  const [filterSide, setFilterSide] = useState("all");
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
      setExecutions(data.executions || []);
      toast({
        title: "Connected",
        description: "Successfully joined session",
      });
    });

    wsClient.on("execution.created", (execution: Execution) => {
      setExecutions((prev) => [execution, ...prev]);
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

  const handleExport = () => {
    const exportData = executions.map(exec => ({
      timestamp: new Date(exec.timestamp || Date.now()).toISOString(),
      execId: exec.execId,
      orderId: exec.orderId,
      symbol: exec.symbol,
      side: exec.side,
      execType: exec.execType,
      orderStatus: exec.orderStatus,
      lastQty: exec.lastQty,
      lastPx: exec.lastPx,
      cumQty: exec.cumQty,
      avgPx: exec.avgPx,
      leavesQty: exec.leavesQty,
      createdBy: exec.createdBy,
    }));

    const csv = [
      ["Timestamp", "ExecID", "OrderID", "Symbol", "Side", "ExecType", "Status", "LastQty", "LastPx", "CumQty", "AvgPx", "LeavesQty", "CreatedBy"],
      ...exportData.map(e => [
        e.timestamp,
        e.execId,
        e.orderId,
        e.symbol,
        e.side,
        e.execType,
        e.orderStatus,
        e.lastQty,
        e.lastPx,
        e.cumQty,
        e.avgPx,
        e.leavesQty,
        e.createdBy,
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fixlab-executions-${sessionName}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Executions Exported",
      description: `Exported ${executions.length} executions`,
    });
  };

  const filteredExecutions = executions.filter(exec => {
    if (filterSymbol && exec.symbol !== filterSymbol) return false;
    if (filterSide !== "all" && exec.side !== filterSide) return false;
    if (searchText && !exec.execId.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const uniqueSymbols = Array.from(new Set(executions.map(e => e.symbol))).sort();

  const execTypeLabels: Record<string, string> = {
    "New": "New",
    "PartiallyFilled": "Partial Fill",
    "Filled": "Filled",
    "Canceled": "Canceled",
    "Replaced": "Replaced",
    "Rejected": "Rejected",
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Filled": return "bg-green-500";
      case "PartiallyFilled": return "bg-blue-500";
      case "Canceled": return "bg-gray-500";
      case "Rejected": return "bg-red-500";
      default: return "bg-yellow-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Execution History</h1>
              <p className="text-sm text-muted-foreground">
                Session: {sessionName} • {username} ({role})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={connected ? "default" : "secondary"} data-testid="status-connection">
                {connected ? "Connected" : "Disconnected"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={executions.length === 0}
                data-testid="button-export-executions"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
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
                <label className="text-sm font-medium mb-2 block">Symbol</label>
                <Select value={filterSymbol} onValueChange={setFilterSymbol}>
                  <SelectTrigger data-testid="select-symbol-filter">
                    <SelectValue placeholder="All Symbols" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Symbols</SelectItem>
                    {uniqueSymbols.map(symbol => (
                      <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Side</label>
                <Select value={filterSide} onValueChange={setFilterSide}>
                  <SelectTrigger data-testid="select-side-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sides</SelectItem>
                    <SelectItem value="Buy">Buy</SelectItem>
                    <SelectItem value="Sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Search ExecID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="input-search-executions"
                    placeholder="Search by ExecID..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredExecutions.length} of {executions.length} executions
            </div>
          </CardContent>
        </Card>

        {/* Executions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Executions ({filteredExecutions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {filteredExecutions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {executions.length === 0 ? "No executions yet" : "No executions match the current filters"}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Time</th>
                      <th className="text-left p-3 font-medium">ExecID</th>
                      <th className="text-left p-3 font-medium">Symbol</th>
                      <th className="text-left p-3 font-medium">Side</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-right p-3 font-medium">Last Qty</th>
                      <th className="text-right p-3 font-medium">Last Px</th>
                      <th className="text-right p-3 font-medium">Cum Qty</th>
                      <th className="text-right p-3 font-medium">Avg Px</th>
                      <th className="text-right p-3 font-medium">Leaves Qty</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExecutions.map((exec, index) => (
                      <tr
                        key={exec.id || index}
                        className="border-b hover-elevate"
                        data-testid={`execution-row-${index}`}
                      >
                        <td className="p-3 text-muted-foreground" data-testid={`time-${index}`}>
                          {new Date(exec.timestamp || Date.now()).toLocaleTimeString()}
                        </td>
                        <td className="p-3 font-mono text-xs" data-testid={`exec-id-${index}`}>
                          {exec.execId}
                        </td>
                        <td className="p-3 font-semibold" data-testid={`symbol-${index}`}>
                          {exec.symbol}
                        </td>
                        <td className="p-3" data-testid={`side-${index}`}>
                          <Badge
                            variant={exec.side === "Buy" ? "default" : "secondary"}
                            className={exec.side === "Buy" ? "bg-green-600" : "bg-red-600"}
                          >
                            {exec.side === "Buy" ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {exec.side}
                          </Badge>
                        </td>
                        <td className="p-3" data-testid={`exec-type-${index}`}>
                          <Badge variant="outline">
                            {execTypeLabels[exec.execType] || exec.execType}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono" data-testid={`last-qty-${index}`}>
                          {exec.lastQty.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono" data-testid={`last-px-${index}`}>
                          ${exec.lastPx.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono" data-testid={`cum-qty-${index}`}>
                          {exec.cumQty.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono" data-testid={`avg-px-${index}`}>
                          ${exec.avgPx.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono" data-testid={`leaves-qty-${index}`}>
                          {exec.leavesQty.toLocaleString()}
                        </td>
                        <td className="p-3" data-testid={`status-${index}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(exec.orderStatus)}`} />
                            {exec.orderStatus}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
