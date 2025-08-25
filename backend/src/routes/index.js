import knex from '../db/index.js';
import cors from '@fastify/cors';
import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function routes(fastify, options) {
  fastify.register(cors, {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  });

  fastify.get('/ping', async (request, reply) => {
    return 'pong\n';
  });

  fastify.get('/emails', async (request, reply) => {
    try {
      const emails = await knex('emails')
        .select('*')
        .orderBy('created_at', 'desc');
      return emails;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch emails' });
    }
  });

  fastify.post('/emails', async (request, reply) => {
    try {
      const { to, cc, bcc, subject, body } = request.body;
      
      const [id] = await knex('emails').insert({
        to,
        cc,
        bcc,
        subject,
        body
      });

      const email = await knex('emails').where('id', id).first();
      return email;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to save email' });
    }
  });

  fastify.post('/generate/router', async (request, reply) => {
    try {
      const { prompt } = request.body;
      
      if (!prompt) {
        return reply.status(400).send({ error: 'Prompt is required' });
      }

      const routerResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: `You are a router assistant that classifies email generation requests. 
          Analyze the user prompt and classify it as either "sales" or "followup":
          - "sales": Use for emails about business propositions, product introductions, service offerings, cold outreach, meeting requests for business purposes
          - "followup": Use for follow-up emails, checking in, status updates, reminder emails
          
          Respond with ONLY the classification word: "sales" or "followup"`
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.1,
        max_tokens: 10
      });

      const classification = routerResponse.choices[0].message.content.trim().toLowerCase();

      let systemPrompt = '';
      if (classification === 'sales') {
        systemPrompt = `You are a Sales Assistant specialized in generating professional sales emails. 
        Key requirements:
        - Keep emails under 40 words total (readable in under 10 seconds)
        - Use 7-10 words per sentence maximum
        - Be direct and compelling
        - Include a clear call-to-action
        - Professional yet engaging tone
        - Personalize when possible
        
        Generate both a subject line and email body based on the user's request.`;
      } else {
        systemPrompt = `You are a Follow-up Assistant specialized in generating polite follow-up emails.
        Key requirements:
        - Professional and courteous tone
        - Clear purpose for following up
        - Respectful of recipient's time
        - Include next steps or call-to-action
        - Keep it concise but not rushed
        
        Generate both a subject line and email body based on the user's request.`;
      }

      const emailResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: systemPrompt + `
          
          Respond in this JSON format:
          {
            "subject": "Your subject line here",
            "body": "Your email body here"
          }`
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 200
      });

      const emailContent = JSON.parse(emailResponse.choices[0].message.content);
      
      // Add scenario note to the email body
      const scenarioNote = classification === 'sales' 
        ? '====SALES====' 
        : '====FOLLOW===';
      
      const bodyWithNote = `${emailContent.body}\n\n${scenarioNote}`;
      
      return {
        subject: emailContent.subject,
        body: bodyWithNote,
        type: classification
      };

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate email content' });
    }
  });
}
