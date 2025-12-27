import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;

    // 프로젝트 루트 경로 찾기
    const projectRoot = process.cwd();
    const targetDir = join(
      projectRoot,
      "..",
      "..",
      "cv.aiion.site",
      "app",
      "yolo",
      "data"
    );

    const filePath = join(targetDir, filename);

    // 파일 존재 확인
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 파일 읽기
    const fileBuffer = await readFile(filePath);

    // MIME 타입 결정
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
    };

    const contentType = mimeTypes[ext || ""] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("이미지 제공 오류:", error);
    return NextResponse.json(
      { error: "이미지를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

