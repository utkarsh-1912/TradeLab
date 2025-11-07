import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SymbolResult {
  symbol: string;
  shortname: string;
  longname: string;
  quoteType: string;
  exchange: string;
  exchDisp: string;
}

interface SymbolSearchProps {
  value?: string;
  onSelect: (symbol: string, result?: SymbolResult) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SymbolSearch({
  value = "",
  onSelect,
  label = "Symbol",
  placeholder = "Search for a symbol...",
  className,
  disabled = false,
}: SymbolSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search function
  const searchSymbols = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/symbols/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data.quotes || []);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Symbol search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value.toUpperCase();
    setQuery(newQuery);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Debounce search by 300ms
    searchTimeout.current = setTimeout(() => {
      searchSymbols(newQuery);
    }, 300);
  };

  // Handle symbol selection
  const handleSelect = (result: SymbolResult) => {
    setQuery(result.symbol);
    setIsOpen(false);
    onSelect(result.symbol, result);
  };

  // Handle manual input (pressing Enter without selecting from dropdown)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (query.trim()) {
        // User pressed Enter with a manual symbol
        setIsOpen(false);
        onSelect(query.trim());
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < results.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Handle input blur - allow manual symbol entry
  const handleBlur = () => {
    // Delay closing to allow clicking on results
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
      )}
      
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="font-mono text-sm pr-9"
          data-testid="input-symbol-search"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-auto shadow-lg">
          <div className="p-1">
            {results.map((result, index) => (
              <button
                key={result.symbol}
                data-testid={`symbol-result-${result.symbol}`}
                onClick={() => handleSelect(result)}
                className={cn(
                  "w-full text-left p-3 rounded-md transition-colors",
                  "hover-elevate active-elevate-2",
                  selectedIndex === index && "bg-accent"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold">
                          {result.symbol}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {result.quoteType}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground truncate">
                        {result.longname || result.shortname}
                      </div>
                      
                      {result.exchDisp && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {result.exchDisp}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* No Results */}
      {isOpen && !isLoading && results.length === 0 && query.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg">
          <div className="p-4 text-center text-sm text-muted-foreground">
            No symbols found for "{query}"
          </div>
        </Card>
      )}
    </div>
  );
}
