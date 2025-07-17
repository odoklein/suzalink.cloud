"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Commande {
  id: string;
  created_at: string;
  data: Record<string, any>;
  status?: string;
  notes?: string;
  opened?: boolean; // Added opened field
}

const STATUS_OPTIONS = ["new", "in progress", "done"];

const FIELD_LABELS: Record<string, string> = {
  "meta[date][value]": "Date d'envoi du formulaire",
  "meta[time][value]": "Heure d'envoi du formulaire",
  "meta[page_url][value]": "Page d'origine",
  "meta[remote_ip][value]": "Adresse IP",
  "fields[nom_et_prenom][value]": "Nom et prénom",
  "fields[secteur_dactivite][value]": "Secteur d'activité",
  "fields[nom_de_lentreprise][value]": "Nom de l'entreprise",
  "fields[date_de_rendez_vous][value]": "Date de rendez vous",
  "fields[heure_du_rendez_vous][value]": "Heure du rendez vous",
};
const FIELD_KEYS = Object.keys(FIELD_LABELS);

function extractMainFields(data: any) {
  const result: Record<string, any> = {};

  // Try flat structure first (fixed keys)
  for (const key of FIELD_KEYS) {
    if (data && data[key]) {
      result[key] = data[key];
    }
  }

  // Fallback to dynamic field keys by matching titles
  if (Object.keys(result).length < FIELD_KEYS.length && data) {
    for (const key of FIELD_KEYS) {
      if (!result[key]) {
        const expectedLabel = FIELD_LABELS[key];
        for (const dataKey in data) {
          if (
            dataKey.startsWith("fields[") &&
            dataKey.endsWith("][title]") &&
            data[dataKey] &&
            data[dataKey].toLowerCase().trim() === expectedLabel.toLowerCase().trim()
          ) {
            const baseKey = dataKey.slice(0, dataKey.lastIndexOf("][title]"));
            const valueKey = `${baseKey}[value]`;
            if (data[valueKey]) {
              result[key] = data[valueKey];
            }
          }
        }
      }
    }
  }

  // Fallback to nested structure (legacy/other sources)
  if (Object.keys(result).length === 0 && data) {
    // Meta fields
    if (data.meta) {
      if (data.meta.date && data.meta.date.value)
        result["meta[date][value]"] = data.meta.date.value;
      if (data.meta.time && data.meta.time.value)
        result["meta[time][value]"] = data.meta.time.value;
      if (data.meta.page_url && data.meta.page_url.value)
        result["meta[page_url][value]"] = data.meta.page_url.value;
      if (data.meta.remote_ip && data.meta.remote_ip.value)
        result["meta[remote_ip][value]"] = data.meta.remote_ip.value;
    }
    // User fields
    if (data.fields) {
      if (data.fields.nom_et_prenom && data.fields.nom_et_prenom.value)
        result["fields[nom_et_prenom][value]"] = data.fields.nom_et_prenom.value;
      if (data.fields.secteur_dactivite && data.fields.secteur_dactivite.value)
        result["fields[secteur_dactivite][value]"] = data.fields.secteur_dactivite.value;
      if (data.fields.nom_de_lentreprise && data.fields.nom_de_lentreprise.value)
        result["fields[nom_de_lentreprise][value]"] = data.fields.nom_de_lentreprise.value;
      if (data.fields.date_de_rendez_vous && data.fields.date_de_rendez_vous.value)
        result["fields[date_de_rendez_vous][value]"] = data.fields.date_de_rendez_vous.value;
      if (data.fields.heure_du_rendez_vous && data.fields.heure_du_rendez_vous.value)
        result["fields[heure_du_rendez_vous][value]"] = data.fields.heure_du_rendez_vous.value;
    }
  }

  return result;
}

// Helper to fetch country and flag for an IP
function useIpLocation(ip: string | undefined) {
  const [geo, setGeo] = useState<{ countryCode?: string; country?: string } | null>(null);
  useEffect(() => {
    if (!ip) return;
    let cancelled = false;
    fetch(`https://ip-api.com/json/${ip}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.status === "success") {
          setGeo({ countryCode: data.countryCode, country: data.country });
        }
      });
    return () => { cancelled = true; };
  }, [ip]);
  return geo;
}

const IPINFO_TOKEN = "3cbb3358902217";

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [ipGeoMap, setIpGeoMap] = useState<Record<string, { countryCode?: string; country?: string }>>({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function fetchCommandes() {
      setLoading(true);
      const { data, error } = await supabase
        .from("commandes")
        .select("*")
        .order("created_at", { ascending: sortDir === "asc" });
      setCommandes(data || []);
      setLoading(false);
    }
    fetchCommandes();
  }, [sortDir]);

  // Fetch geolocation for all unique IPs
  useEffect(() => {
    const ips = Array.from(new Set(commandes.map(c => extractMainFields(c.data)["meta[remote_ip][value]"]).filter(Boolean)));
    ips.forEach(ip => {
      if (!ipGeoMap[ip]) {
        fetch(`https://ipinfo.io/${ip}/json?token=${IPINFO_TOKEN}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.country) {
              setIpGeoMap(prev => ({
                ...prev,
                [ip]: { countryCode: data.country, country: data.country }
              }));
            }
          });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandes]);

  // Search/filter logic (search only in main fields)
  const filteredCommandes = commandes.filter((commande) => {
    const mainFields = extractMainFields(commande.data);
    if (!search) return true;
    const values = Object.values(mainFields).join(" ").toLowerCase();
    return values.includes(search.toLowerCase());
  });

  // Handle status/notes updates (local state only for now)
  const handleStatusChange = (id: string, status: string) => {
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  };
  const handleNotesChange = (id: string, notes: string) => {
    setNotesMap((prev) => ({ ...prev, [id]: notes }));
  };

  // Handle opening a card (set opened in DB)
  const handleOpenCommande = async (commande: Commande) => {
    setSelectedCommande(commande);
    if (!commande.opened) {
      await fetch("/api/commandes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commande.id }),
      });
      setCommandes((prev) => prev.map(c => c.id === commande.id ? { ...c, opened: true } : c));
    }
  };

  return (
    <div className="p-8 w-full min-h-screen bg-muted">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Commandes</h1>
          <p className="text-gray-600 max-w-2xl">
            Toutes les commandes reçues via les formulaires Elementor.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            className="w-64"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button
            variant={sortDir === "desc" ? "default" : "outline"}
            onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
          >
            Trier: {sortDir === "desc" ? "Plus récent" : "Plus ancien"}
          </Button>
        </div>
      </div>
      <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl mx-auto mb-12">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))
        ) : filteredCommandes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 text-lg">
            (Aucune commande à afficher pour l'instant)
          </div>
        ) : (
          filteredCommandes.map((commande) => {
            const mainFields = extractMainFields(commande.data);
            const isOpened = commande.opened;
            return (
              <div
                key={commande.id}
                className={`relative p-6 rounded-2xl border bg-white flex flex-col gap-4 shadow transition cursor-pointer hover:shadow-lg min-h-[200px] ${!isOpened ? "ring-2 ring-red-400" : ""}`}
                onClick={() => handleOpenCommande(commande)}
              >
                {!isOpened && (
                  <div className="-mt-6 -mx-6 mb-2 px-6 py-2 rounded-t-2xl bg-red-50 flex items-center justify-between border-b border-red-200">
                    <span className="text-sm font-semibold text-red-600">Nouvelle demande</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-4">
                  <div className="text-xs text-gray-400">
                    Reçu le {new Date(commande.created_at).toLocaleString()}
                  </div>
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    value={statusMap[commande.id] || "new"}
                    onChange={e => handleStatusChange(commande.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <table className="w-full text-sm mb-4">
                  <tbody>
                    {FIELD_KEYS.map((key) => {
                      const mainFields = extractMainFields(commande.data);
                      if (!mainFields[key]) return null;
                      // Special handling for IP address
                      if (key === "meta[remote_ip][value]") {
                        const ip = mainFields[key];
                        const geo = ipGeoMap[ip];
                        return (
                          <tr key={key} className="h-8 align-top">
                            <td className="font-medium text-gray-700 pr-4 whitespace-nowrap">{FIELD_LABELS[key]}</td>
                            <td className="text-gray-900 pl-2 flex items-center gap-2">
                              {ip}
                              {mounted && geo?.countryCode && (
                                <span title={geo.country} className="ml-2">
                                  <img
                                    src={`https://flagcdn.com/24x18/${geo.countryCode.toLowerCase()}.png`}
                                    alt={geo.country}
                                    width={24}
                                    height={18}
                                    style={{ borderRadius: 2, border: '1px solid #eee' }}
                                  />
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      }
                      // Default rendering
                      return (
                        <tr key={key} className="h-8 align-top">
                          <td className="font-medium text-gray-700 pr-4 whitespace-nowrap">{FIELD_LABELS[key]}</td>
                          <td className="text-gray-900 pl-2">{String(mainFields[key])}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <textarea
                  className="mt-2 w-full border rounded p-3 text-xs text-gray-700 min-h-[48px]"
                  placeholder="Notes internes..."
                  value={notesMap[commande.id] || ""}
                  onChange={e => handleNotesChange(commande.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            );
          })
        )}
      </div>
      {/* Details Modal */}
      {selectedCommande && (
        <Dialog open={!!selectedCommande} onOpenChange={() => setSelectedCommande(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détails de la Commande</DialogTitle>
            </DialogHeader>
            <div className="mb-2 text-xs text-gray-400">
              Reçu le {new Date(selectedCommande.created_at).toLocaleString()}
            </div>
            <table className="w-full text-sm mb-4">
              <tbody>
                {FIELD_KEYS.map((key) => {
                  const mainFields = extractMainFields(selectedCommande.data);
                  return mainFields[key] ? (
                    <tr key={key}>
                      <td className="font-medium text-gray-700 pr-2">{FIELD_LABELS[key]}</td>
                      <td className="text-gray-900">{String(mainFields[key])}</td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                className="border rounded px-2 py-1 text-xs"
                value={statusMap[selectedCommande.id] || "new"}
                onChange={e => handleStatusChange(selectedCommande.id, e.target.value)}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                className="w-full border rounded p-2 text-xs text-gray-700"
                placeholder="Notes internes..."
                value={notesMap[selectedCommande.id] || ""}
                onChange={e => handleNotesChange(selectedCommande.id, e.target.value)}
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setSelectedCommande(null)}>Fermer</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 