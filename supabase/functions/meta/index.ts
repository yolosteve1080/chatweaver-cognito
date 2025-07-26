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
    const { conversation_id, categories } = await req.json();

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: 'conversation_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting meta analysis for conversation:', conversation_id, 'categories:', categories);

    // Get Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Load existing analysis from conversation_summary
    const { data: existingSummary } = await supabase
      .from('conversation_summary')
      .select('meta_analysis')
      .eq('conversation_id', conversation_id)
      .single();

    let currentAnalysis = {
      kernideen: [],
      erkenntnisse: [],
      offene_fragen: [],
      todos: []
    };

    if (existingSummary?.meta_analysis) {
      currentAnalysis = existingSummary.meta_analysis;
    }

    // Get recent chat messages for this conversation
    const { data: messages, error: dbError } = await supabase
      .from('chat_messages')
      .select('user_message, assistant_message, timestamp')
      .eq('conversation_id', conversation_id)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({
        analysis: currentAnalysis,
        message_count: 0,
        success: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no categories specified, update all
    const categoriesToUpdate = categories && categories.length > 0 ? categories : ['kernideen', 'erkenntnisse', 'offene_fragen', 'todos'];

    console.log(`Analyzing ${messages.length} messages`);

    // Prepare conversation history for analysis (reverse to chronological order)
    const conversationText = messages.reverse().map(msg => 
      `User: ${msg.user_message}\nAssistant: ${msg.assistant_message}`
    ).join('\n\n');

    // Create focused prompt based on categories to update
    const categoryPrompts = {
      kernideen: "1. Kernideen: Die wichtigsten Konzepte oder Themen",
      erkenntnisse: "2. Erkenntnisse: Wichtige Erkenntnisse oder Schlussfolgerungen", 
      offene_fragen: "3. Offene Fragen: Fragen, die noch nicht beantwortet wurden",
      todos: "4. To-dos: Konkrete Aufgaben oder Aktionen, die identifiziert wurden"
    };

    const selectedPrompts = categoriesToUpdate.map(cat => categoryPrompts[cat]).join('\n');
    const responseFields = categoriesToUpdate.map(cat => `"${cat}": ["Punkt 1", "Punkt 2", ...]`).join(',\n  ');

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
            content: `Du bist ein Meta-Analyst für Gespräche. Analysiere den folgenden Chatverlauf und extrahiere NUR die angeforderten Kategorien:

${selectedPrompts}

Antworte im folgenden JSON-Format (nur die angeforderten Felder):
{
  ${responseFields}
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
    let newAnalysis;
    try {
      newAnalysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse JSON, using fallback');
      newAnalysis = {};
      categoriesToUpdate.forEach(cat => {
        newAnalysis[cat] = ["Analyse wird verarbeitet..."];
      });
    }

    // Merge new analysis with existing analysis
    const updatedAnalysis = { ...currentAnalysis };
    categoriesToUpdate.forEach(category => {
      if (newAnalysis[category]) {
        updatedAnalysis[category] = newAnalysis[category];
      }
    });

    // Save updated analysis to database
    await supabase
      .from('conversation_summary')
      .upsert({
        conversation_id,
        meta_analysis: updatedAnalysis,
        message_count: messages.length,
        summary_text: 'Meta-Analyse',
        updated_at: new Date().toISOString()
      });

    return new Response(JSON.stringify({ 
      analysis: updatedAnalysis,
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