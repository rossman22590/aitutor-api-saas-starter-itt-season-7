// app/api/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { files, teamMembers } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
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

    // Get all files for the team, ordered by most recent
    const fileList = await db.select()
      .from(files)
      .where(eq(files.teamId, team.id))
      .orderBy(desc(files.createdAt));

    return NextResponse.json(fileList);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
