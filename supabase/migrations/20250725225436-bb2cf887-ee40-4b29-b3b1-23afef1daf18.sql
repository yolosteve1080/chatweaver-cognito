-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for conversations
CREATE POLICY "Allow public read access to conversations" 
ON public.conversations 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to conversations" 
ON public.conversations 
FOR UPDATE 
USING (true);

-- Add conversation_id to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Add conversation_id to conversation_summary
ALTER TABLE public.conversation_summary 
ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_conversation_summary_conversation_id ON public.conversation_summary(conversation_id);