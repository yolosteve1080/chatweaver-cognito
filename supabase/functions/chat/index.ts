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
    const requestBody = await req.text();
    let parsedBody;
    
    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error('Failed to parse request body as JSON:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { message, conversation_id } = parsedBody;
    
    if (!message || !conversation_id) {
      return new Response(JSON.stringify({ error: 'Message and conversation_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing chat message for conversation:', conversation_id);

    // Get Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Load last 10 messages from this conversation
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('user_message, assistant_message')
      .eq('conversation_id', conversation_id)
      .order('timestamp', { ascending: false })
      .limit(10);

    // Load existing summary if available
    const { data: summaryData } = await supabase
      .from('conversation_summary')
      .select('summary_text')
      .eq('conversation_id', conversation_id)
      .single();

    // Build context messages
    const contextMessages = [];
    
    // Add system message
    contextMessages.push({
      role: 'system',
      content: 'Du bist ein hilfreicher KI-Assistent. Antworte auf Deutsch und sei präzise und nützlich.'
    });

    // Add summary if available
    if (summaryData?.summary_text) {
      contextMessages.push({
        role: 'system',
        content: `Bisherige Gesprächszusammenfassung: ${summaryData.summary_text}`
      });
    }

    // Add recent messages (reverse order for chronological)
    if (recentMessages) {
      recentMessages.reverse().forEach(msg => {
        contextMessages.push({ role: 'user', content: msg.user_message });
        contextMessages.push({ role: 'assistant', content: msg.assistant_message });
      });
    }

    // Add current message
    contextMessages.push({ role: 'user', content: message });

    // Call OpenAI GPT-4
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: contextMessages,
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

    // Save to database with conversation_id
    const { error: dbError } = await supabase
      .from('chat_messages')
      .insert({
        user_message: message,
        assistant_message: assistantMessage,
        conversation_id: conversation_id,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Saved to database successfully');

    // Check if we need to update summary (every 5 messages)
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation_id);

    if (count && count % 5 === 0) {
      // Generate new summary
      const { data: allMessages } = await supabase
        .from('chat_messages')
        .select('user_message, assistant_message')
        .eq('conversation_id', conversation_id)
        .order('timestamp', { ascending: true });

      if (allMessages) {
        const conversationText = allMessages.map(msg => 
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
            messages: [{
              role: 'system',
              content: `Erstelle eine kompakte Zusammenfassung (max. 400 Tokens) des folgenden Gesprächs. Fokussiere auf die wichtigsten Themen, Entscheidungen und offenen Punkte:\n\n${conversationText}`
            }],
            temperature: 0.3,
            max_tokens: 400,
          }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const summary = summaryData.choices[0].message.content;

          // Save or update summary
          await supabase
            .from('conversation_summary')
            .upsert({
              conversation_id: conversation_id,
              summary_text: summary,
            });
        }
      }
    }

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