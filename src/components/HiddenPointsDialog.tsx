import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HiddenPoint {
  id: string;
  type: string;
  text: string;
}

interface HiddenPointsDialogProps {
  conversationId: string;
  onUpdate: () => void;
}

export const HiddenPointsDialog = ({ conversationId, onUpdate }: HiddenPointsDialogProps) => {
  const [hiddenPoints, setHiddenPoints] = useState<HiddenPoint[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const loadHiddenPoints = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('meta_points')
        .select('id, type, text')
        .eq('conversation_id', conversationId)
        .eq('hidden', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHiddenPoints(data || []);
    } catch (error) {
      console.error('Error loading hidden points:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHiddenPoints();
    }
  }, [isOpen, conversationId]);

  const restorePoint = async (pointId: string) => {
    try {
      const { error } = await supabase
        .from('meta_points')
        .update({ hidden: false })
        .eq('id', pointId);

      if (error) throw error;

      toast({
        title: "Punkt wiederhergestellt",
        description: "Der Punkt ist wieder sichtbar",
      });

      loadHiddenPoints();
      onUpdate();
    } catch (error) {
      console.error('Error restoring point:', error);
      toast({
        title: "Fehler",
        description: "Punkt konnte nicht wiederhergestellt werden",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'kernidee': return 'Kernidee';
      case 'erkenntnis': return 'Erkenntnis';
      case 'frage': return 'Offene Frage';
      case 'todo': return 'To-do';
      default: return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mb-4">
          <EyeOff className="h-4 w-4 mr-2" />
          Versteckte Punkte anzeigen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Versteckte Punkte</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          {hiddenPoints.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Keine versteckten Punkte vorhanden
            </p>
          ) : (
            <div className="space-y-3">
              {hiddenPoints.map((point) => (
                <div key={point.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">
                      {getTypeLabel(point.type)}
                    </div>
                    <p className="text-sm">{point.text}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restorePoint(point.id)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Wiederherstellen
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};