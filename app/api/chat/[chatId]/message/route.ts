// app/api/chat/[chatId]/message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { 
  chats as chatsTable, 
  chatMessages as chatMessagesTable,
  teamMembers,
  files
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { incrementMessageCount, checkMessageLimit } from '@/lib/db/utils';
import axios from 'axios';

// Helper function to clean streaming response
function cleanStreamResponse(response: string): string {
  // Check if response matches chunked format pattern
  if (/\d+:".*?"/g.test(response)) {
    // Extract text content from each chunk and join them
    const cleanedText = response
      .match(/\d+:"(.*?)"/g)
      ?.map(chunk => {
        const match = chunk.match(/\d+:"(.*?)"/);
        return match ? match[1] : '';
      })
      .join('') || '';
    
    return cleanedText;
  }
  
  // If not in the expected format, return as-is
  return response;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ chatId: string }> }
) {
  try {
    // Properly await the params object first
    const { chatId: chatIdParam } = await context.params;
    const chatId = parseInt(chatIdParam);
    
    if (isNaN(chatId)) {
      return NextResponse.json({ error: 'Invalid chat ID' }, { status: 400 });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's team
    const userTeamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
      with: {
        team: true,
      },
    });

    if (!userTeamMember || !userTeamMember.team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const team = userTeamMember.team;
    
    // Check message limit
    const { withinLimit, remainingMessages } = await checkMessageLimit(team.id);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Message limit reached', remainingMessages },
        { status: 402 }
      );
    }

    // Verify the chat belongs to the user's team
    const chat = await db.query.chats.findFirst({
      where: and(
        eq(chatsTable.id, chatId),
        eq(chatsTable.teamId, team.id)
      ),
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const messages = body.messages || [];
    const fileId = body.fileId; // Extract fileId if present
    
    console.log('Request body:', { 
      fileId: fileId || 'None', 
      messagesCount: messages.length 
    });
    
    // Check for valid messages
    const lastUserMessage = messages[messages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }
    
    // Update the chat's updated_at timestamp
    await db.update(chatsTable)
      .set({ updatedAt: new Date() })
      .where(eq(chatsTable.id, chatId));
    
    // Save the user message to the database
    await db.insert(chatMessagesTable)
      .values({
        chatId,
        role: 'user',
        content: lastUserMessage.content,
        createdAt: new Date(),
      });
    
    // Update chat title if it's still the default
    if (chat.title === 'New Chat') {
      const title = lastUserMessage.content.substring(0, 30) + 
        (lastUserMessage.content.length > 30 ? '...' : '');
      
      await db.update(chatsTable)
        .set({ title })
        .where(eq(chatsTable.id, chatId));
    }
    
    // Increment the team's message count
    await incrementMessageCount(team.id);
    
    // Variable to hold the messages we'll send to the AI
    let apiRequestBody;
    
    // Check if a fileId is provided and is not empty or undefined
    if (fileId && typeof fileId === 'string' && fileId.trim() !== '') {
      console.log(`File ID detected: ${fileId} - Using RAG`);
      
      try {
        // Verify the file exists and belongs to the team
        const fileRecord = await db.query.files.findFirst({
          where: and(
            eq(files.fileId, fileId),
            eq(files.teamId, team.id)
          ),
        });
        
        if (!fileRecord) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
        
        // Get the RAG API key
        const ragApiKey = process.env.AITUTOR_RAG_KEY;
        if (!ragApiKey) {
          console.error('Missing AITUTOR_RAG_KEY environment variable');
          return NextResponse.json(
            { error: 'RAG service configuration error' },
            { status: 500 }
          );
        }
        
        // Query the embeddings API
        const ragApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://rag-api-llm.up.railway.app';
        console.log(`Querying RAG embeddings API at: ${ragApiUrl}/embeddings`);
        
        const ragResponse = await axios.post(
          `${ragApiUrl}/embeddings`,
          {
            query: lastUserMessage.content,
            file_ids: [fileId],
            k: 5 // Get top 5 relevant chunks
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': ragApiKey,
            },
          }
        );
        
        // Extract document content
        const documents = ragResponse.data.documents;
        if (!documents || documents.length === 0) {
          return NextResponse.json({
            error: 'No relevant documents found for the query',
            status: 404
          });
        }
        
        // Create context from document content
        const context = documents.map((doc: { content: string }) => doc.content).join("\n\n");
        
        // Create a specialized prompt with context and query
        const enhancedPrompt = `Answer the query based on the following document content from "${fileRecord.fileName}":\n\n${context}\n\nQuery: ${lastUserMessage.content}`;
        
        // Create a modified messages array with the enhanced prompt for the last user message
        const enhancedMessages = [...messages.slice(0, -1), { role: 'user', content: enhancedPrompt }];
        
        // Use the enhanced messages for the API request
        apiRequestBody = { messages: enhancedMessages };
        console.log('Using enhanced messages with document context');
      } catch (error: any) {
        console.error('Error querying RAG API:', error);
        
        // Add detailed error information
        let errorMessage = 'Failed to process document query';
        let statusCode = 500;
        
        if (axios.isAxiosError(error)) {
          errorMessage = `RAG API error: ${error.message}`;
          statusCode = error.response?.status || 500;
          
          console.error('RAG API response data:', error.response?.data);
          console.error('RAG API status:', error.response?.status);
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: statusCode }
        );
      }
    } else {
      // No file ID or invalid file ID - use normal conversation with standard prompt
      console.log('No file ID detected - Using standard chat with friendly AI prompt');
      
      // Create a standard prompt
      const standardPrompt = `You are a friendly AI assistant designed to answer all of the user queries\n\nQuery: ${lastUserMessage.content}`;
      
      // Create a modified messages array with the standard prompt for the last user message
      const standardMessages = [...messages.slice(0, -1), { role: 'user', content: standardPrompt }];
      
      apiRequestBody = { messages: standardMessages };
    }
    
    // Call the AI Tutor API
    const token = process.env.NEXT_PUBLIC_AITUTOR_TOKEN;
    
    console.log('Sending request to AI Tutor API with body type:', 
      fileId ? 'Enhanced with document context' : 'Standard messages with friendly AI prompt');
    
    const apiResponse = await fetch(
      `https://aitutor-api.vercel.app/api/v1/chat/${token}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AITUTOR_API_KEY}`,
        },
        body: JSON.stringify(apiRequestBody),
      }
    );

    if (!apiResponse.ok) {
      return NextResponse.json(
        { error: 'AI service returned an error' },
        { status: apiResponse.status }
      );
    }

    if (!apiResponse.body) {
      return NextResponse.json(
        { error: 'No response body' },
        { status: 500 }
      );
    }

    // Create a response stream to the client
    const responseBody = apiResponse.body;
    let fullResponse = '';
    
    // Create a transformed stream
    const { readable, writable } = new TransformStream();
    const reader = responseBody.getReader();
    const writer = writable.getWriter();
    
    // Process the stream in the background
    (async () => {
      try {
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            writer.close();
            
            // Save the complete response to the database
            if (fullResponse) {
              // Clean up the response format 
              const cleanedText = cleanStreamResponse(fullResponse);
              
              await db.insert(chatMessagesTable)
                .values({
                  chatId,
                  role: 'assistant',
                  content: cleanedText,
                  createdAt: new Date(),
                });
            }
            break;
          }
          
          // Decode the chunk and add to full response
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          
          // Forward the chunk to the client
          await writer.write(value);
        }
      } catch (error) {
        console.error('Error processing stream:', error);
        writer.abort(error as Error);
      }
    })();
    
    // Return the stream to the client
    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
