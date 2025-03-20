// app/api/files/[fileId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { files, teamMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params;
    
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

    // Verify the file belongs to the user's team
    const file = await db.query.files.findFirst({
      where: and(
        eq(files.id, parseInt(fileId)),
        eq(files.teamId, team.id)
      ),
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete the file from our database
    await db.delete(files)
      .where(eq(files.id, parseInt(fileId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
