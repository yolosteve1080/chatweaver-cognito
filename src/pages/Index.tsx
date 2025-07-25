import { useState } from "react";
import { ChatArea } from "@/components/ChatArea";
import { MetaAnalysis } from "@/components/MetaAnalysis";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const handleNewMessage = () => {
    // Trigger meta analysis refresh when new message is sent
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNewConversation = async () => {
    try {
      const today = new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({ title: `Chat vom ${today}` })
        .select()
        .single();

      if (error) throw error;

      setActiveConversationId(data.id);
      toast({
        title: "Neuer Chat erstellt",
        description: "Sie können jetzt mit dem neuen Chat beginnen",
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Fehler",
        description: "Neuer Chat konnte nicht erstellt werden",
        variant: "destructive",
      });
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Co-Pilot Board</h1>
          <p className="text-muted-foreground">
            Intelligente Chat-Analyse mit GPT-4
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-120px)] flex">
        {/* Sidebar */}
        <div className="w-80 border-r">
          <ConversationSidebar
            activeConversationId={activeConversationId}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
          />
        </div>

        {/* Chat and Analysis Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
          {/* Chat Area */}
          <div className="h-full">
            <ChatArea 
              conversationId={activeConversationId}
              onNewMessage={handleNewMessage} 
            />
          </div>

          {/* Meta Analysis */}
          <div className="h-full border-l">
            <MetaAnalysis 
              conversationId={activeConversationId}
              refreshTrigger={refreshTrigger} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
