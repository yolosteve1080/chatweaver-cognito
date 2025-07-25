-- Create conversation_summary table
CREATE TABLE public.conversation_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_text TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.conversation_summary ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (same as chat_messages)
CREATE POLICY "Allow public read access to conversation summary" 
ON public.conversation_summary 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to conversation summary" 
ON public.conversation_summary 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to conversation summary" 
ON public.conversation_summary 
FOR UPDATE 
USING (true);