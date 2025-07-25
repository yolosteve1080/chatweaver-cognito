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
    const { message } = await req.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing chat message:', message);

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Load last 10 messages for context
    const { data: recentMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('user_message, assistant_message, timestamp')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('Error loading recent messages:', messagesError);
    }

    // Load existing summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('conversation_summary')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (summaryError) {
      console.error('Error loading summary:', summaryError);
    }

    const totalMessages = recentMessages?.length || 0;
    const lastSummaryCount = summaryData?.message_count || 0;
    const needsNewSummary = !summaryData || (totalMessages - lastSummaryCount >= 5);

    let currentSummary = summaryData?.summary_text || '';

    // Create new summary if needed
    if (needsNewSummary && recentMessages && recentMessages.length > 0) {
      console.log('Creating new conversation summary');
      
      const summaryMessages = recentMessages.reverse().map(msg => 
        `User: ${msg.user_message}\nAssistant: ${msg.assistant_message}`
      ).join('\n\n');

      const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'Erstelle eine kompakte Zusammenfassung des Gesprächs in maximal 400 Tokens. Fokussiere auf wichtige Themen, Entscheidungen und den Kontext der Unterhaltung.'
            },
            { role: 'user', content: `Hier ist der Gesprächsverlauf:\n\n${summaryMessages}` }
          ],
          temperature: 0.3,
          max_tokens: 400,
        }),
      });

      if (summaryResponse.ok) {
        const summaryResult = await summaryResponse.json();
        currentSummary = summaryResult.choices[0].message.content;

        // Save or update summary
        if (summaryData) {
          await supabase
            .from('conversation_summary')
            .update({
              summary_text: currentSummary,
              updated_at: new Date().toISOString(),
              message_count: totalMessages
            })
            .eq('id', summaryData.id);
        } else {
          await supabase
            .from('conversation_summary')
            .insert({
              summary_text: currentSummary,
              message_count: totalMessages
            });
        }

        console.log('Summary updated successfully');
      }
    }

    // Prepare hybrid context for GPT
    const messages = [
      { 
        role: 'system', 
        content: 'Du bist ein hilfreicher KI-Assistent. Antworte auf Deutsch und sei präzise und nützlich.' 
      }
    ];

    // Add summary if available
    if (currentSummary) {
      messages.push({
        role: 'system',
        content: `Hier ist eine Zusammenfassung des bisherigen Gesprächs: ${currentSummary}`
      });
    }

    // Add recent messages in chronological order
    if (recentMessages && recentMessages.length > 0) {
      const chronologicalMessages = recentMessages.reverse();
      chronologicalMessages.forEach(msg => {
        messages.push({ role: 'user', content: msg.user_message });
        messages.push({ role: 'assistant', content: msg.assistant_message });
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    console.log(`Sending ${messages.length} messages to GPT including summary`);

    // Call OpenAI GPT-4 with full context
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    console.log('Got response from OpenAI');

    // Save to database
    const { error: dbError } = await supabase
      .from('chat_messages')
      .insert({
        user_message: message,
        assistant_message: assistantMessage,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Saved to database successfully');

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});