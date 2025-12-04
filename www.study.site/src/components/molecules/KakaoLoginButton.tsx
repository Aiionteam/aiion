"use client";

import React from "react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

interface KakaoLoginButtonProps {
  onClick: () => void;
}

export const KakaoLoginButton: React.FC<KakaoLoginButtonProps> = ({
  onClick,
}) => {
  return (
    <Button variant="google" onClick={onClick}>
      <Icon name="kakao" size={20} />
      <span>카카오로 시작하기</span>
    </Button>
  );
};

