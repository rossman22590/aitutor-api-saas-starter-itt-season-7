// app/api/chat/[chatId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { 
  chats as chatsTable,
  teamMembers 
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
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

    // Delete the chat (chat messages will be cascade deleted due to foreign key)
    await db.delete(chatsTable)
      .where(eq(chatsTable.id, chatId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
