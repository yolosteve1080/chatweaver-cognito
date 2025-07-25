import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting meta analysis');

    // Get chat history from database
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    const { data: messages, error: dbError } = await supabase
      .from('chat_messages')
      .select('user_message, assistant_message, timestamp')
      .order('timestamp', { ascending: true })
      .limit(20); // Last 20 messages

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({
        analysis: {
          kernideen: [],
          erkenntnisse: [],
          offene_fragen: [],
          todos: []
        },
        success: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing ${messages.length} messages`);

    // Prepare conversation history for analysis
    const conversationText = messages.map(msg => 
      `User: ${msg.user_message}\nAssistant: ${msg.assistant_message}`
    ).join('\n\n');

    // Call OpenAI for meta analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `Du bist ein Meta-Analyst für Gespräche. Analysiere den folgenden Chatverlauf und extrahiere:

1. Kernideen: Die wichtigsten Konzepte oder Themen
2. Erkenntnisse: Wichtige Erkenntnisse oder Schlussfolgerungen
3. Offene Fragen: Fragen, die noch nicht beantwortet wurden
4. To-dos: Konkrete Aufgaben oder Aktionen, die identifiziert wurden

Antworte im folgenden JSON-Format:
{
  "kernideen": ["Idee 1", "Idee 2", ...],
  "erkenntnisse": ["Erkenntnis 1", "Erkenntnis 2", ...],
  "offene_fragen": ["Frage 1", "Frage 2", ...],
  "todos": ["Todo 1", "Todo 2", ...]
}

Sei präzise und fokussiere dich auf die wichtigsten Punkte. Maximal 5 Punkte pro Kategorie.` 
          },
          { role: 'user', content: conversationText }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    console.log('Got meta analysis from OpenAI');

    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse JSON, using fallback');
      analysis = {
        kernideen: ["Analyse wird verarbeitet..."],
        erkenntnisse: ["Erkenntnisse werden extrahiert..."],
        offene_fragen: ["Fragen werden identifiziert..."],
        todos: ["Aufgaben werden erfasst..."]
      };
    }

    return new Response(JSON.stringify({ 
      analysis,
      success: true,
      message_count: messages.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in meta analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});