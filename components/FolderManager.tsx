import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

interface Folder {
  id: string;
  name: string;
  count: number;
}

export default function FolderManager() {
  const [folders, setFolders] = useState<Folder[]>([
    { id: "1", name: "All Prospects", count: 12 },
    { id: "2", name: "Initial Contact", count: 4 },
    { id: "3", name: "Follow-up", count: 3 },
    { id: "4", name: "Closed", count: 2 },
    { id: "5", name: "Tech Industry", count: 2 },
    { id: "6", name: "Retail", count: 1 },
    { id: "7", name: "Europe", count: 3 },
    { id: "8", name: "VIP", count: 1 },
  ]);
  const [newFolder, setNewFolder] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Create folder
  const handleCreate = () => {
    if (newFolder.trim()) {
      setFolders([...folders, { id: Math.random().toString(), name: newFolder, count: 0 }]);
      setNewFolder("");
    }
  };

  // Edit folder
  const handleEdit = (id: string) => {
    setEditId(id);
    setEditName(folders.find(f => f.id === id)?.name || "");
  };
  const handleEditSave = () => {
    setFolders(folders.map(f => f.id === editId ? { ...f, name: editName } : f));
    setEditId(null);
    setEditName("");
  };

  // Delete folder
  const handleDelete = (id: string) => {
    setFolders(folders.filter(f => f.id !== id));
  };

  // Drag and drop
  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDrop = (id: string) => {
    if (!draggedId || draggedId === id) return;
    const draggedIdx = folders.findIndex(f => f.id === draggedId);
    const dropIdx = folders.findIndex(f => f.id === id);
    const reordered = [...folders];
    const [removed] = reordered.splice(draggedIdx, 1);
    reordered.splice(dropIdx, 0, removed);
    setFolders(reordered);
    setDraggedId(null);
  };

  // Bulk move (mock)
  const handleBulkMove = (folderId: string) => {
    alert(`Bulk move to folder: ${folders.find(f => f.id === folderId)?.name}`);
  };

  return (
    <Card className="p-4 space-y-4">
      <h2 className="text-lg font-semibold mb-2">Manage Folders</h2>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="New folder name"
          value={newFolder}
          onChange={e => setNewFolder(e.target.value)}
          className="w-48"
        />
        <Button onClick={handleCreate}>Create</Button>
      </div>
      <ul className="space-y-2">
        {folders.map(folder => (
          <li
            key={folder.id}
            draggable
            onDragStart={() => handleDragStart(folder.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(folder.id)}
            className="flex items-center gap-2 bg-muted rounded px-2 py-1 cursor-move"
          >
            {editId === folder.id ? (
              <>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-32"
                />
                <Button size="sm" onClick={handleEditSave}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <span className="flex-1">{folder.name}</span>
                <span className="text-xs bg-white rounded px-2 py-0.5">{folder.count}</span>
                <Button size="sm" variant="outline" onClick={() => handleEdit(folder.id)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(folder.id)}>Delete</Button>
                <Button size="sm" variant="ghost" onClick={() => handleBulkMove(folder.id)}>Bulk Move</Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
} 