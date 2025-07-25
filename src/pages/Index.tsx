import { useState } from "react";
import { ChatArea } from "@/components/ChatArea";
import { MetaAnalysis } from "@/components/MetaAnalysis";

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleNewMessage = () => {
    // Trigger meta analysis refresh when new message is sent
    setRefreshTrigger(prev => prev + 1);
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
      <div className="container mx-auto px-4 py-6 h-[calc(100vh-120px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Chat Area - Left Panel */}
          <div className="h-full">
            <ChatArea onNewMessage={handleNewMessage} />
          </div>

          {/* Meta Analysis - Right Panel */}
          <div className="h-full">
            <MetaAnalysis refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
