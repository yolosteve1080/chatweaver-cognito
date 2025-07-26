-- Create meta_points table for individual Meta-GPT analysis points
CREATE TABLE public.meta_points (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('kernidee', 'erkenntnis', 'frage', 'todo')),
    text TEXT NOT NULL,
    hidden BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.meta_points ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching the pattern of other tables)
CREATE POLICY "Allow public read access to meta points" 
ON public.meta_points 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to meta points" 
ON public.meta_points 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to meta points" 
ON public.meta_points 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to meta points" 
ON public.meta_points 
FOR DELETE 
USING (true);

-- Create index for better performance
CREATE INDEX idx_meta_points_conversation_id ON public.meta_points(conversation_id);
CREATE INDEX idx_meta_points_type ON public.meta_points(type);
CREATE INDEX idx_meta_points_hidden ON public.meta_points(hidden);