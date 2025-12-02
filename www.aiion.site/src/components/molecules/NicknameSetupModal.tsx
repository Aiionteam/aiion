"use client";

import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';

interface NicknameSetupModalProps {
  isOpen: boolean;
  currentNickname: string;
  onSave: (nickname: string) => Promise<void>;
  onClose?: () => void;
}

export function NicknameSetupModal({ 
  isOpen, 
  currentNickname, 
  onSave, 
  onClose 
}: NicknameSetupModalProps) {
  const [nickname, setNickname] = useState(currentNickname);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    // 유효성 검사
    if (!nickname || nickname.trim().length === 0) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    if (nickname.trim().length > 20) {
      setError('닉네임은 20자 이하로 입력해주세요.');
      return;
    }

    // 특수문자 검사 (선택사항)
    const specialChars = /[<>\"'&]/;
    if (specialChars.test(nickname)) {
      setError('닉네임에 사용할 수 없는 문자가 포함되어 있습니다.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(nickname.trim());
      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '닉네임 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-4">
          닉네임 설정
        </h2>
        
        <p className="text-gray-300 mb-4">
          애플리케이션에서 사용할 닉네임을 입력해주세요.
        </p>

        <div className="mb-4">
          <Input
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            placeholder="닉네임을 입력하세요"
            className="w-full"
            maxLength={20}
            disabled={isSaving}
          />
          
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
          
          <p className="text-gray-500 text-sm mt-2">
            {nickname.length}/20자
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          {onClose && (
            <Button
              onClick={onClose}
              variant="secondary"
              disabled={isSaving}
            >
              나중에
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || !nickname.trim()}
            className="min-w-[100px]"
          >
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}

