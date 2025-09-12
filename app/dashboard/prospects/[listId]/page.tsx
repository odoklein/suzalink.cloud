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
    <div className="w-full h-full">
      <ProspectsGrid listId={listId} />
    </div>
  );
}
