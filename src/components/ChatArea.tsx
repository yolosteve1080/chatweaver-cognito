import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  user_message: string;
  assistant_message: string;
  timestamp: string;
}

interface ChatAreaProps {
  conversationId: string | null;
  onNewMessage?: () => void;
}

export const ChatArea = ({ conversationId, onNewMessage }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [conversationId]); // Nur bei conversationId-Änderung laden, nicht bei refreshTrigger

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) {
      toast({
        title: "Fehler",
        description: "Nachrichten konnten nicht geladen werden",
        variant: "destructive",
      });
      return;
    }

    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !conversationId) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('chat', {
        body: { 
          message: userMessage, 
          conversation_id: conversationId 
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      // Reload messages to get the latest
      await loadMessages();
      
      // Notify parent component about new message
      onNewMessage?.();

      toast({
        title: "Nachricht gesendet",
        description: "GPT-4 hat geantwortet",
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Nachricht konnte nicht gesendet werden",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          {conversationId ? "Chat mit GPT-4" : "Wählen Sie einen Chat"}
        </h2>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Starte eine Unterhaltung mit GPT-4</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-3">
                {/* User Message */}
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground p-2 rounded-full shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm">{message.user_message}</p>
                  </div>
                </div>

                {/* Assistant Message */}
                <div className="flex items-start gap-3">
                  <div className="bg-secondary text-secondary-foreground p-2 rounded-full shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-card border p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap">{message.assistant_message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="bg-secondary text-secondary-foreground p-2 rounded-full shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-card border p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">GPT-4 schreibt...</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {conversationId && (
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Schreibe eine Nachricht..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};