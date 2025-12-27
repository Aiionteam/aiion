import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "파일이 없습니다." },
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

    // 디렉토리 생성 (없으면)
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }

    const savedFiles: string[] = [];

    // 각 파일 저장
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // 파일명 중복 처리
      let fileName = file.name;
      let filePath = join(targetDir, fileName);
      let counter = 1;

      while (existsSync(filePath)) {
        const ext = fileName.substring(fileName.lastIndexOf("."));
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));
        fileName = `${nameWithoutExt}_${counter}${ext}`;
        filePath = join(targetDir, fileName);
        counter++;
      }

      await writeFile(filePath, buffer);
      savedFiles.push(fileName);
    }

    return NextResponse.json({
      success: true,
      message: `${savedFiles.length}개의 파일이 저장되었습니다.`,
      files: savedFiles,
      path: targetDir,
    });
  } catch (error: any) {
    console.error("파일 업로드 오류:", error);
    return NextResponse.json(
      { error: "파일 저장 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

