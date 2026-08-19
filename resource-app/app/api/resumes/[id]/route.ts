import { NextResponse } from "next/server";

import { getConsultantById } from "@/lib/data";
import { extractSingleSlidePptx } from "@/lib/resumes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilename(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "resume"
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const consultant = getConsultantById(id);
  if (!consultant) {
    return NextResponse.json({ message: "Consultant not found." }, { status: 404 });
  }
  if (!consultant.resumeSlideNumber) {
    return NextResponse.json(
      { message: "No resume slide is linked to this person." },
      { status: 404 },
    );
  }

  try {
    const buf = extractSingleSlidePptx(consultant.resumeSlideNumber);
    const filename = `${safeFilename(consultant.name)} resume.pptx`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { message: (e as Error).message || "Could not extract the slide." },
      { status: 500 },
    );
  }
}
