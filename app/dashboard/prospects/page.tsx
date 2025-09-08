"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListsCards } from "./components/ListsCards";
import { CreateListModal } from "./components/CreateListModal";
import { GenerateAIListModal } from "./components/GenerateAIListModal";

export default function ProspectsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch lists
  const fetchLists = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prospects/lists");
      const data = await res.json();
      
      if (data.lists) {
        setLists(data.lists);
      }
    } catch (error) {
      console.error("Error fetching prospect lists:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  // Filter lists based on active tab
  const filteredLists = lists.filter(list => {
    if (activeTab === "all") return true;
    if (activeTab === "assigned") return !!list.client_id;
    if (activeTab === "unassigned") return !list.client_id;
    return true;
  });

  return (
    <div className="w-full py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Prospects</h1>
          <p className="text-slate-600">
            Gérez vos listes de prospects et campagnes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAddModalOpen(true)}
          >
            Importer Prospects CSV
          </Button>
          <Button
            onClick={() => setAiModalOpen(true)}
          >
            Générer Liste avec IA
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aperçu des Listes</CardTitle>
          <CardDescription className="text-slate-600">
            Parcourez et organisez vos collections de prospects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Toutes les Listes</TabsTrigger>
              <TabsTrigger value="assigned">Assignées au Client</TabsTrigger>
              <TabsTrigger value="unassigned">Non Assignées</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <ListsCards
                lists={filteredLists}
                loading={loading}
                onRefresh={fetchLists}
              />
            </TabsContent>
            <TabsContent value="assigned" className="mt-4">
              <ListsCards
                lists={filteredLists}
                loading={loading}
                onRefresh={fetchLists}
              />
            </TabsContent>
            <TabsContent value="unassigned" className="mt-4">
              <ListsCards
                lists={filteredLists}
                loading={loading}
                onRefresh={fetchLists}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Prospects Modal */}
      <CreateListModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={fetchLists}
      />

      {/* AI Generate Modal */}
      <GenerateAIListModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onSuccess={fetchLists}
      />
    </div>
  );
}
