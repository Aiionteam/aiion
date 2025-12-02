"use client";

import React from 'react';
import { MainLayout } from '../../components/templates/MainLayout';
import { useHomePage } from '../hooks/useHomePage';

export const HomePage: React.FC = () => {
  const hookData = useHomePage();

  return (
    <MainLayout {...hookData}>
      {/* 어드민 페이지 - 카테고리 제거됨 */}
    </MainLayout>
  );
};

