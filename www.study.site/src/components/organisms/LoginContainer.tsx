"use client";

import React from "react";
import { FormInput } from "../molecules/FormInput";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import { Link } from "../atoms/Link";
import { GoogleLoginButton } from "../molecules/GoogleLoginButton";
import { KakaoLoginButton } from "../molecules/KakaoLoginButton";
import { NaverLoginButton } from "../molecules/NaverLoginButton";
import { useLoginStore } from "@/store";

export const LoginContainer: React.FC = () => {
  const {
    username,
    password,
    rememberMe,
    setUsername,
    setPassword,
    setRememberMe,
    handleLogin,
    handleGoogleLogin,
    handleKakaoLogin,
    handleNaverLogin,
  } = useLoginStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Login Form Container */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input */}
          <FormInput
            type="text"
            value={username}
            onChange={setUsername}
            placeholder="Username"
            icon="user"
          />

          {/* Password Input */}
          <FormInput
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Password"
            icon="lock"
          />

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <Checkbox
              checked={rememberMe}
              onChange={setRememberMe}
              label="Remember me"
            />
            <Link onClick={() => console.log("Forgot password")}>
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <Button type="submit" variant="primary">
            LOGIN
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Google Login Button */}
          <GoogleLoginButton onClick={handleGoogleLogin} />

          {/* Kakao Login Button */}
          <KakaoLoginButton onClick={handleKakaoLogin} />

          {/* Naver Login Button */}
          <NaverLoginButton onClick={handleNaverLogin} />
        </form>
      </div>
    </div>
  );
};

