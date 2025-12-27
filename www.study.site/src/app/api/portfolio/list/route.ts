import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET() {
  try {
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

    // 디렉토리가 없으면 빈 배열 반환
    if (!existsSync(targetDir)) {
      return NextResponse.json({
        success: true,
        files: [],
        path: targetDir,
      });
    }

    // 파일 목록 읽기
    const fileNames = await readdir(targetDir);
    const files = await Promise.all(
      fileNames.map(async (fileName) => {
        const filePath = join(targetDir, fileName);
        try {
          const stats = await stat(filePath);
          return {
            name: fileName,
            path: filePath,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
          };
        } catch (error) {
          return {
            name: fileName,
            path: filePath,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      files,
      path: targetDir,
    });
  } catch (error: any) {
    console.error("파일 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "파일 목록을 불러오는 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

