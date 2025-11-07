import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ExportImportProps {
  sessionId: string;
  sessionName: string;
  onMessagesImported?: () => void;
}

export function ExportImport({ sessionId, sessionName, onMessagesImported }: ExportImportProps) {
  const { toast } = useToast();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const url = `/api/sessions/${sessionId}/export?format=${format}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${sessionName}-messages.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export Successful",
        description: `Messages exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export messages",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const messages = JSON.parse(text);

      await apiRequest('POST', `/api/sessions/${sessionId}/import`, messages);

      toast({
        title: "Import Successful",
        description: `Imported ${messages.length} messages`,
      });

      setImportDialogOpen(false);
      onMessagesImported?.();
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import messages. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              data-testid="button-export-messages"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              onClick={() => handleExport('json')}
              data-testid="menu-export-json"
            >
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleExport('csv')}
              data-testid="menu-export-csv"
            >
              Export as CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportDialogOpen(true)}
          data-testid="button-import-messages"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent data-testid="dialog-import-messages">
          <DialogHeader>
            <DialogTitle>Import Messages</DialogTitle>
            <DialogDescription>
              Upload a JSON file containing FIX messages to import into this session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              disabled={importing}
              data-testid="input-import-file"
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Only JSON format is supported for import. The file should contain an array of message objects.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
