import { supabase } from "@/lib/supabase";

// Create user profile after registration
export async function createUserProfile(userId: string, email: string, fullName?: string, role: 'admin' | 'manager' | 'user' = 'user') {
  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        id: userId,
        email: email,
        full_name: fullName || email.split('@')[0],
        role: role
      }
    ]);
  if (error) throw error;
  return data;
}

// Example: Insert a new prospect
export async function insertProspect() {
  const { data, error } = await supabase.from("prospects").insert([
    {
      name: "John Doe",
      email: "john@example.com",
      phone: "123-456-7890",
      status: "New"
    }
  ]);
  if (error) throw error;
  return data;
}

// Example: Fetch all prospects (authenticated)
export async function fetchProspects() {
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Example: Insert a new client
export async function insertClient() {
  const { data, error } = await supabase.from("clients").insert([
    {
      name: "Acme Corp",
      contact_email: "contact@acme.com",
      company: "Acme Corp"
    }
  ]);
  if (error) throw error;
  return data;
}

// Example: Fetch all clients
export async function fetchClients() {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Example: Insert a new project
export async function insertProject() {
  const { data, error } = await supabase.from("projects").insert([
    {
      title: "Website Redesign",
      description: "Redesign the company website",
      status: "Active"
    }
  ]);
  if (error) throw error;
  return data;
}

// Example: Fetch all projects
export async function fetchProjects() {
  const { data, error } = await supabase.from("projects").select("*");
  if (error) throw error;
  return data;
}

// Example: Insert a new task
export async function insertTask(project_id: string) {
  const { data, error } = await supabase.from("tasks").insert([
    {
      project_id,
      title: "Initial Planning",
      status: "Pending"
    }
  ]);
  if (error) throw error;
  return data;
}

// Example: Fetch all tasks for a project
export async function fetchTasks(project_id: string) {
  const { data, error } = await supabase.from("tasks").select("*").eq("project_id", project_id);
  if (error) throw error;
  return data;
}

// Example: Insert a new entry (finance)
export async function insertEntry() {
  const { data, error } = await supabase.from("entries").insert([
    {
      type: "income",
      amount: 1000,
      description: "Consulting fee",
      date: "2024-07-01"
    }
  ]);
  if (error) throw error;
  return data;
}

// Example: Fetch all entries
export async function fetchEntries() {
  const { data, error } = await supabase.from("entries").select("*").order("date", { ascending: false });
  if (error) throw error;
  return data;
}

// Example: Insert a new message
export async function insertMessage(sender_id: string, receiver_id: string) {
  const { data, error } = await supabase.from("messages").insert([
    {
      sender_id,
      receiver_id,
      content: "Hello!"
    }
  ]);
  if (error) throw error;
  return data;
}

// Example: Fetch all messages between two users
export async function fetchMessages(sender_id: string, receiver_id: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}`)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return data;
} 