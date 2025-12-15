"use client";

import React from "react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

interface GoogleLoginButtonProps {
  onClick: () => void;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onClick,
}) => {
  return (
    <Button variant="google" onClick={onClick}>
      <Icon name="google" size={20} />
      <span>Continue with Google</span>
    </Button>
  );
};

