"use client";

import React from "react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

interface NaverLoginButtonProps {
  onClick: () => void;
}

export const NaverLoginButton: React.FC<NaverLoginButtonProps> = ({
  onClick,
}) => {
  return (
    <Button variant="google" onClick={onClick}>
      <Icon name="naver" size={20} />
      <span>네이버로 시작하기</span>
    </Button>
  );
};

