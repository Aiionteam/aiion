import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: "파일명이 필요합니다." },
        { status: 400 }
      );
    }

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

    const filePath = join(targetDir, fileName);

    // 파일 존재 확인
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 파일 삭제
    await unlink(filePath);

    return NextResponse.json({
      success: true,
      message: `"${fileName}" 파일이 삭제되었습니다.`,
    });
  } catch (error: any) {
    console.error("파일 삭제 오류:", error);
    return NextResponse.json(
      { error: "파일 삭제 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

