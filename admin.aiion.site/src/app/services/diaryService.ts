/**
 * 일기 서비스 레이어
 * DiaryView 컴포넌트의 비즈니스 로직을 서비스로 분리
 */

import { Diary } from '../../components/types';
import { useCreateDiary, useUpdateDiary, useDeleteDiary } from '../hooks/useDiary';

export interface DateValidationResult {
  isValid: boolean;
  errorMessage: string;
}

export interface DiaryFormData {
  year: number;
  month: number;
  day: number;
  title: string;
  content: string;
  emotion: string;
}

export interface SaveDiaryParams {
  formData: DiaryFormData;
  selectedDiary: Diary | null;
  createDiaryMutation: ReturnType<typeof useCreateDiary>;
  updateDiaryMutation: ReturnType<typeof useUpdateDiary>;
}

export interface DeleteDiaryParams {
  selectedDiary: Diary;
  deleteDiaryMutation: ReturnType<typeof useDeleteDiary>;
}

/**
 * 날짜 유효성 검사
 */
export function validateDiaryDate(
  year: number,
  month: number,
  day: number
): DateValidationResult {
  if (year < 1000 || year > 9999) {
    return {
      isValid: false,
      errorMessage: '년도는 1000년부터 9999년까지 입력 가능합니다.',
    };
  }

  if (month < 1 || month > 12) {
    return {
      isValid: false,
      errorMessage: '월은 1부터 12까지 입력 가능합니다.',
    };
  }

  if (day < 1 || day > 31) {
    return {
      isValid: false,
      errorMessage: '일은 1부터 31일까지 입력 가능합니다.',
    };
  }

  return {
    isValid: true,
    errorMessage: '',
  };
}

/**
 * 일기 저장/수정 유효성 검사
 */
export function validateDiaryForm(
  formData: DiaryFormData
): { isValid: boolean; errorMessage: string } {
  const dateValidation = validateDiaryDate(
    formData.year,
    formData.month,
    formData.day
  );

  if (!dateValidation.isValid) {
    return {
      isValid: false,
      errorMessage: dateValidation.errorMessage,
    };
  }

  if (!formData.title.trim()) {
    return {
      isValid: false,
      errorMessage: '제목을 입력해주세요.',
    };
  }

  if (formData.content.length > 9999) {
    return {
      isValid: false,
      errorMessage: '텍스트가 너무 길어 저장할 수 없습니다.',
    };
  }

  return {
    isValid: true,
    errorMessage: '',
  };
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
export function formatDiaryDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 일기 저장/수정 서비스
 */
export async function saveDiaryService(
  params: SaveDiaryParams
): Promise<{ success: boolean; errorMessage?: string }> {
  const { formData, selectedDiary, createDiaryMutation, updateDiaryMutation } = params;

  // 유효성 검사
  const validation = validateDiaryForm(formData);
  if (!validation.isValid) {
    return {
      success: false,
      errorMessage: validation.errorMessage,
    };
  }

  // 날짜를 YYYY-MM-DD 형식으로 변환
  const diaryDate = formatDiaryDate(formData.year, formData.month, formData.day);

  try {
    if (selectedDiary) {
      // 수정 모드
      console.log('[diaryService] 수정 모드');
      const updatedDiary: Diary = {
        ...selectedDiary,
        date: diaryDate,
        title: formData.title,
        content: formData.content,
        emotion: formData.emotion,
      };

      await updateDiaryMutation.mutateAsync(updatedDiary);
      console.log('[diaryService] 수정 완료');
    } else {
      // 생성 모드
      console.log('[diaryService] 생성 모드');
      const newDiary: Diary = {
        id: Date.now().toString(), // 임시 ID (백엔드에서 실제 ID 반환)
        date: diaryDate,
        title: formData.title,
        content: formData.content,
        emotion: formData.emotion,
        emotionScore: 5,
      };

      await createDiaryMutation.mutateAsync(newDiary);
      console.log('[diaryService] 생성 완료');
    }

    console.log('[diaryService] ✅ 저장 성공');
    return { success: true };
  } catch (error) {
    console.error('[diaryService] ❌ 일기 저장 실패:', error);
    return {
      success: false,
      errorMessage:
        error instanceof Error
          ? error.message
          : '일기를 저장하는데 실패했습니다.',
    };
  }
}

/**
 * 일기 삭제 서비스
 */
export async function deleteDiaryService(
  params: DeleteDiaryParams
): Promise<{ success: boolean; errorMessage?: string }> {
  const { selectedDiary, deleteDiaryMutation } = params;

  try {
    console.log('[diaryService] 일기 삭제 시작:', selectedDiary);
    await deleteDiaryMutation.mutateAsync(selectedDiary);
    console.log('[diaryService] 삭제 성공');
    return { success: true };
  } catch (error) {
    console.error('[diaryService] ❌ 일기 삭제 실패:', error);
    return {
      success: false,
      errorMessage:
        error instanceof Error
          ? error.message
          : '일기를 삭제하는데 실패했습니다.',
    };
  }
}

