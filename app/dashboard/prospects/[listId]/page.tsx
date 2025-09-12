"use client";

import React from "react";
import { ProspectsGrid } from "../components/ProspectsGrid";

interface ProspectListPageProps {
  params: {
    listId: string;
  };
}

export default function ProspectListPage({ params }: ProspectListPageProps) {
  const { listId } = params;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ProspectsGrid listId={listId} />
      </div>
    </div>
  );
}
