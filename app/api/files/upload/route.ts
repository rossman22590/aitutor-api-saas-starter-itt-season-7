// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { files, teamMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
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

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - only PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 10MB' },
        { status: 400 }
      );
    }

    // Create a new FormData to send to the RAG API
    const apiFormData = new FormData();
    apiFormData.append('file', file);

    // Make request to AI Tutor RAG API
    const apiKey = process.env.AITUTOR_RAG_KEY;
    const apiResponse = await fetch('https://rag-api-llm.up.railway.app/upload_file', {
      method: 'POST',
      headers: {
        'authorization': apiKey || '',
      },
      body: apiFormData,
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to upload file to RAG service' },
        { status: apiResponse.status }
      );
    }

    const apiData = await apiResponse.json();

    // Save the file metadata to our database
    const [newFile] = await db.insert(files)
      .values({
        fileId: apiData.file_id,
        fileName: file.name,
        fileType: 'pdf',
        teamId: team.id,
        userId: user.id,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      id: newFile.id,
      fileId: newFile.fileId,
      fileName: newFile.fileName,
      fileType: newFile.fileType,
      createdAt: newFile.createdAt,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
