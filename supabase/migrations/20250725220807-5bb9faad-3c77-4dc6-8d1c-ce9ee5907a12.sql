-- Create chat_messages table for storing chat history
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (no auth required for this app)
CREATE POLICY "Allow public read access to chat messages" 
ON public.chat_messages 
FOR SELECT 
USING (true);

-- Create policy to allow public insert access
CREATE POLICY "Allow public insert access to chat messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (true);

-- Create index for better query performance on timestamp
CREATE INDEX idx_chat_messages_timestamp ON public.chat_messages(timestamp DESC);