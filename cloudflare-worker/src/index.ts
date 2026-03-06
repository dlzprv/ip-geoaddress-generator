export interface Env {
  DB: KVNamespace;
}

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  receivedAt: string;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    const emailId = crypto.randomUUID();
    
    const emailData: EmailMessage = {
      id: emailId,
      from: message.from,
      to: message.to,
      subject: message.headers.get('subject') || 'No Subject',
      receivedAt: new Date().toISOString(),
    };

    const reader = message.raw.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const rawEmail = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      rawEmail.set(chunk, offset);
      offset += chunk.length;
    }
    
    const emailText = new TextDecoder().decode(rawEmail);
    
    const htmlMatch = emailText.match(/Content-Type: text\/html[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\n$)/i);
    const textMatch = emailText.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\n$)/i);
    
    if (htmlMatch) {
      emailData.html = htmlMatch[1].trim();
    }
    if (textMatch) {
      emailData.text = textMatch[1].trim();
    }

    const emailAddress = message.to.toLowerCase();
    const existingEmails = await env.DB.get(`emails:${emailAddress}`, 'json') as EmailMessage[] || [];
    existingEmails.unshift(emailData);
    
    await env.DB.put(`emails:${emailAddress}`, JSON.stringify(existingEmails));
    
    const allAddresses = await env.DB.get('allAddresses', 'json') as string[] || [];
    if (!allAddresses.includes(emailAddress)) {
      allAddresses.push(emailAddress);
      await env.DB.put('allAddresses', JSON.stringify(allAddresses));
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/api/create-address' && request.method === 'POST') {
        const body = await request.json() as { address: string };
        const emailAddress = body.address.toLowerCase();
        
        const existingAddresses = await env.DB.get('allAddresses', 'json') as string[] || [];
        if (!existingAddresses.includes(emailAddress)) {
          existingAddresses.push(emailAddress);
          await env.DB.put('allAddresses', JSON.stringify(existingAddresses));
        }
        
        await env.DB.put(`emails:${emailAddress}`, JSON.stringify([]));
        
        return new Response(JSON.stringify({ 
          success: true, 
          address: emailAddress 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/emails' && request.method === 'GET') {
        const address = url.searchParams.get('address')?.toLowerCase();
        
        if (!address) {
          return new Response(JSON.stringify({ error: 'Address required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const emails = await env.DB.get(`emails:${address}`, 'json') as EmailMessage[] || [];
        
        return new Response(JSON.stringify(emails), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/delete-email' && request.method === 'DELETE') {
        const body = await request.json() as { address: string; emailId: string };
        const { address, emailId } = body;
        
        const emails = await env.DB.get(`emails:${address}`, 'json') as EmailMessage[] || [];
        const filteredEmails = emails.filter(email => email.id !== emailId);
        
        await env.DB.put(`emails:${address}`, JSON.stringify(filteredEmails));
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/delete-address' && request.method === 'DELETE') {
        const body = await request.json() as { address: string };
        const { address } = body;
        
        await env.DB.delete(`emails:${address}`);
        
        const allAddresses = await env.DB.get('allAddresses', 'json') as string[] || [];
        const filteredAddresses = allAddresses.filter(addr => addr !== address);
        await env.DB.put('allAddresses', JSON.stringify(filteredAddresses));
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
