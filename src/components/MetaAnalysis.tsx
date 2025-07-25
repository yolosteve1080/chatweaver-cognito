import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, Download, RefreshCw, Lightbulb, HelpCircle, CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Analysis {
  kernideen: string[];
  erkenntnisse: string[];
  offene_fragen: string[];
  todos: string[];
}

interface MetaAnalysisProps {
  refreshTrigger?: number;
}

export const MetaAnalysis = ({ refreshTrigger }: MetaAnalysisProps) => {
  const [analysis, setAnalysis] = useState<Analysis>({
    kernideen: [],
    erkenntnisse: [],
    offene_fragen: [],
    todos: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalysis();
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadAnalysis();
    }
  }, [refreshTrigger]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalysis();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadAnalysis = async () => {
    setIsLoading(true);
    
    try {
      const response = await supabase.functions.invoke('meta', {
        body: {},
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      setAnalysis(response.data.analysis);
      setMessageCount(response.data.message_count || 0);

    } catch (error) {
      console.error('Error loading meta analysis:', error);
      toast({
        title: "Fehler",
        description: "Meta-Analyse konnte nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportAnalysis = () => {
    const exportData = {
      analysis,
      messageCount,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copilot-board-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export erfolgreich",
      description: "Meta-Analyse wurde als JSON exportiert",
    });
  };

  const renderSection = (title: string, items: string[], icon: React.ReactNode, color: string) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {items.length}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">
            Noch keine {title.toLowerCase()} identifiziert
          </p>
        ) : (
          items.map((item, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border-l-4 bg-muted/50 ${color}`}
            >
              <p className="text-sm">{item}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Meta-GPT Analyse
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {messageCount} Nachrichten
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAnalysis}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAnalysis}
              disabled={messageCount === 0}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messageCount === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Keine Nachrichten zum Analysieren</p>
            <p className="text-sm mt-2">Starte eine Unterhaltung, um eine Meta-Analyse zu erhalten</p>
          </div>
        ) : (
          <div className="space-y-6">
            {isLoading && (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Analysiere Gespräch...</p>
              </div>
            )}

            {renderSection(
              "Kernideen",
              analysis.kernideen,
              <Lightbulb className="h-4 w-4 text-yellow-600" />,
              "border-l-yellow-500"
            )}

            <Separator />

            {renderSection(
              "Erkenntnisse", 
              analysis.erkenntnisse,
              <Brain className="h-4 w-4 text-blue-600" />,
              "border-l-blue-500"
            )}

            <Separator />

            {renderSection(
              "Offene Fragen",
              analysis.offene_fragen,
              <HelpCircle className="h-4 w-4 text-orange-600" />,
              "border-l-orange-500"
            )}

            <Separator />

            {renderSection(
              "To-dos",
              analysis.todos,
              <CheckSquare className="h-4 w-4 text-green-600" />,
              "border-l-green-500"
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Automatische Aktualisierung alle 30 Sekunden
        </p>
      </div>
    </Card>
  );
};