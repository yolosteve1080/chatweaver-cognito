import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, Download, RefreshCw, Lightbulb, HelpCircle, CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MetaPointMenu } from "./MetaPointMenu";
import { HiddenPointsDialog } from "./HiddenPointsDialog";

interface MetaPoint {
  id: string;
  type: string;
  text: string;
  hidden: boolean;
}

interface Analysis {
  kernideen: MetaPoint[];
  erkenntnisse: MetaPoint[];
  offene_fragen: MetaPoint[];
  todos: MetaPoint[];
}

interface MetaAnalysisProps {
  conversationId: string | null;
  refreshTrigger?: number;
}

export const MetaAnalysis = ({ conversationId, refreshTrigger }: MetaAnalysisProps) => {
  const [analysis, setAnalysis] = useState<Analysis>({
    kernideen: [],
    erkenntnisse: [],
    offene_fragen: [],
    todos: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState<string[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalysis();
  }, [conversationId]);

  const loadAnalysis = async () => {
    if (!conversationId) {
      setAnalysis({
        kernideen: [],
        erkenntnisse: [],
        offene_fragen: [],
        todos: []
      });
      setMessageCount(0);
      return;
    }

    setIsLoading(true);
    
    try {
      // Load points from meta_points table
      const { data: points, error: pointsError } = await supabase
        .from('meta_points')
        .select('id, type, text, hidden')
        .eq('conversation_id', conversationId)
        .eq('hidden', false)
        .order('created_at', { ascending: true });

      if (pointsError) throw pointsError;

      // Group points by type
      const groupedPoints: Analysis = {
        kernideen: [],
        erkenntnisse: [],
        offene_fragen: [],
        todos: []
      };

      points?.forEach(point => {
        switch (point.type) {
          case 'kernidee':
            groupedPoints.kernideen.push(point);
            break;
          case 'erkenntnis':
            groupedPoints.erkenntnisse.push(point);
            break;
          case 'frage':
            groupedPoints.offene_fragen.push(point);
            break;
          case 'todo':
            groupedPoints.todos.push(point);
            break;
        }
      });

      setAnalysis(groupedPoints);

      // Get message count
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('conversation_id', conversationId);

      setMessageCount(messages?.length || 0);

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

  const updateAnalysisCategory = async (categories: string[]) => {
    if (!conversationId) return;

    setLoadingCategories(categories);
    
    try {
      const response = await supabase.functions.invoke('meta', {
        body: { 
          conversation_id: conversationId,
          categories: categories 
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      // Reload analysis after update
      loadAnalysis();

      const categoryNames = categories.map(cat => {
        switch(cat) {
          case 'kernideen': return 'Kernideen';
          case 'erkenntnisse': return 'Erkenntnisse';
          case 'offene_fragen': return 'Offene Fragen';
          case 'todos': return 'To-dos';
          default: return cat;
        }
      }).join(', ');

      toast({
        title: "Aktualisierung erfolgreich",
        description: `${categoryNames} wurden aktualisiert`,
      });

    } catch (error) {
      console.error('Error updating meta analysis:', error);
      toast({
        title: "Fehler",
        description: "Meta-Analyse konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    } finally {
      setLoadingCategories([]);
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

  const renderSection = (title: string, items: MetaPoint[], icon: React.ReactNode, color: string) => (
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
          items.map((item) => (
            <div 
              key={item.id}
              className={`p-3 rounded-lg border-l-4 bg-muted/50 ${color} flex items-start justify-between`}
            >
              <p className="text-sm flex-1">{item.text}</p>
              <MetaPointMenu 
                pointId={item.id} 
                isHidden={item.hidden} 
                onUpdate={loadAnalysis} 
              />
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
            {/* Hidden Points Dialog */}
            <HiddenPointsDialog conversationId={conversationId} onUpdate={loadAnalysis} />
            
            {/* Update Buttons */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Analyse aktualisieren:</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateAnalysisCategory(['kernideen'])}
                  disabled={loadingCategories.includes('kernideen')}
                  className="justify-start"
                >
                  {loadingCategories.includes('kernideen') ? (
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <Lightbulb className="h-3 w-3 mr-2" />
                  )}
                  Kernideen
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateAnalysisCategory(['erkenntnisse'])}
                  disabled={loadingCategories.includes('erkenntnisse')}
                  className="justify-start"
                >
                  {loadingCategories.includes('erkenntnisse') ? (
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-3 w-3 mr-2" />
                  )}
                  Erkenntnisse
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateAnalysisCategory(['offene_fragen'])}
                  disabled={loadingCategories.includes('offene_fragen')}
                  className="justify-start"
                >
                  {loadingCategories.includes('offene_fragen') ? (
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <HelpCircle className="h-3 w-3 mr-2" />
                  )}
                  Offene Fragen
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateAnalysisCategory(['todos'])}
                  disabled={loadingCategories.includes('todos')}
                  className="justify-start"
                >
                  {loadingCategories.includes('todos') ? (
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <CheckSquare className="h-3 w-3 mr-2" />
                  )}
                  To-dos
                </Button>
              </div>
              
              <Button
                variant="default"
                size="sm"
                onClick={() => updateAnalysisCategory(['kernideen', 'erkenntnisse', 'offene_fragen', 'todos'])}
                disabled={loadingCategories.length > 0}
                className="w-full"
              >
                {loadingCategories.length > 0 ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Alles aktualisieren
              </Button>
            </div>

            <Separator />

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
          Manuelle Aktualisierung verfügbar
        </p>
      </div>
    </Card>
  );
};