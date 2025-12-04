"use client";

import React from "react";
import { SearchInput } from "../molecules/SearchInput";
import { useSearchStore } from "@/store";

export const SearchBar: React.FC = () => {
  const { query, setQuery, count, handleAdd, handleMic } = useSearchStore();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      // 검색 실행 로직
      console.log("Search:", query);
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <SearchInput
        value={query}
        onChange={setQuery}
        onAddClick={handleAdd}
        onMicClick={handleMic}
        count={count}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

