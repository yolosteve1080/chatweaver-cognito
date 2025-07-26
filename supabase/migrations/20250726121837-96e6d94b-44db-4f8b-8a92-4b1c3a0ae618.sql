-- Add meta_analysis column to conversation_summary table to store the analysis results
ALTER TABLE public.conversation_summary 
ADD COLUMN meta_analysis JSONB DEFAULT '{
  "kernideen": [],
  "erkenntnisse": [],
  "offene_fragen": [],
  "todos": []
}'::jsonb;