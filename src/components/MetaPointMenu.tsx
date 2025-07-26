import React from "react";
import { MoreVertical, EyeOff, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MetaPointMenuProps {
  pointId: string;
  isHidden: boolean;
  onUpdate: () => void;
}

export const MetaPointMenu = ({ pointId, isHidden, onUpdate }: MetaPointMenuProps) => {
  const { toast } = useToast();

  const toggleHidden = async () => {
    try {
      const { error } = await supabase
        .from('meta_points')
        .update({ hidden: !isHidden })
        .eq('id', pointId);

      if (error) throw error;

      toast({
        title: isHidden ? "Punkt wiederhergestellt" : "Punkt ausgeblendet",
        description: isHidden ? "Der Punkt ist wieder sichtbar" : "Der Punkt wurde ausgeblendet",
      });

      onUpdate();
    } catch (error) {
      console.error('Error toggling point visibility:', error);
      toast({
        title: "Fehler",
        description: "Punkt konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  };

  const deletePoint = async () => {
    try {
      const { error } = await supabase
        .from('meta_points')
        .delete()
        .eq('id', pointId);

      if (error) throw error;

      toast({
        title: "Punkt gelöscht",
        description: "Der Punkt wurde dauerhaft entfernt",
      });

      onUpdate();
    } catch (error) {
      console.error('Error deleting point:', error);
      toast({
        title: "Fehler",
        description: "Punkt konnte nicht gelöscht werden",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={toggleHidden}>
          {isHidden ? <Eye className="h-3 w-3 mr-2" /> : <EyeOff className="h-3 w-3 mr-2" />}
          {isHidden ? "Wiederherstellen" : "Ausblenden"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={deletePoint} className="text-destructive">
          <Trash2 className="h-3 w-3 mr-2" />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};