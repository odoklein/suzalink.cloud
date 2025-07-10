import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface ProspectFormProps {
  initialValues?: {
    name?: string;
    email?: string;
    phone?: string;
    assignedUser?: string;
    status?: string;
    region?: string;
  };
  users?: string[];
  regions?: string[];
  onSave: (values: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ProspectForm({
  initialValues = {},
  users = ["Alice", "Bob", "Charlie"],
  regions = ["Europe", "North America", "Asia"],
  onSave,
  onCancel,
  loading = false,
}: ProspectFormProps) {
  const [form, setForm] = useState({
    name: initialValues.name || "",
    email: initialValues.email || "",
    phone: initialValues.phone || "",
    assignedUser: initialValues.assignedUser || "",
    status: initialValues.status || "Contacted",
    region: initialValues.region || "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError("Name and Email are required.");
      return;
    }
    setError(null);
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" value={form.name} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" value={form.phone} onChange={handleChange} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assignedUser">Assigned User</Label>
        <select
          id="assignedUser"
          name="assignedUser"
          value={form.assignedUser}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Select user</option>
          {users.map((user) => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          value={form.status}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
        >
          <option value="Contacted">Contacted</option>
          <option value="Follow-up">Follow-up</option>
          <option value="Closed">Closed</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="region">Region/Category</Label>
        <select
          id="region"
          name="region"
          value={form.region}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Select region/category</option>
          {regions.map((region) => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div className="flex gap-4 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Prospect"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
} 