import { useState, useEffect } from "react";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
}

export const ConversationSidebar = ({
  activeConversationId,
  onConversationSelect,
  onNewConversation,
}: ConversationSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data || []);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-4">
        <Button 
          onClick={onNewConversation}
          className="w-full justify-start"
          variant="default"
        >
          <Plus className="mr-2 h-4 w-4" />
          Neuer Chat
        </Button>
      </div>
      
      <Separator />
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <Button
              key={conversation.id}
              variant="ghost"
              onClick={() => onConversationSelect(conversation.id)}
              className={cn(
                "w-full justify-start h-auto p-3 text-left",
                activeConversationId === conversation.id && "bg-accent"
              )}
            >
              <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-medium">
                  {conversation.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(conversation.created_at)}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};