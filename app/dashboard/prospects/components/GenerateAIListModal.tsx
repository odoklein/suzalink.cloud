import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, MapPin, Building2, Users, Loader2, CheckCircle, Eye, ArrowLeft, ArrowRight } from "lucide-react";

// Form schema
const formSchema = z.object({
  industry: z.string().min(1, "L'industrie est requise"),
  location: z.string().min(1, "La localisation est requise"),
  targetCount: z.number().min(10, "Minimum 10 prospects").max(500, "Maximum 500 prospects"),
  listName: z.string().min(1, "Le nom de la liste est requis"),
});

type FormValues = z.infer<typeof formSchema>;

interface GenerateAIListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const industries = [
  "Technologie & IT",
  "Santé & Médical",
  "Immobilier",
  "Services Juridiques",
  "Services Financiers",
  "Commerce de Détail",
  "Manufacturing",
  "Construction",
  "Hôtellerie & Tourisme",
  "Éducation",
  "Automobile",
  "Alimentation & Boissons",
  "Services Professionnels",
  "Services à Domicile",
  "Divertissement",
];

const locations = [
  "Paris, France",
  "Lyon, France",
  "Marseille, France",
  "Toulouse, France",
  "Nice, France",
  "Nantes, France",
  "Strasbourg, France",
  "Montpellier, France",
  "Bordeaux, France",
  "Lille, France",
  "Rennes, France",
  "Reims, France",
  "Saint-Étienne, France",
  "Toulon, France",
  "Le Havre, France",
];

interface ScrapedProspect {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  category?: string;
  source: string;
  confidence_score: number;
}

interface PreviewData {
  prospects: ScrapedProspect[];
  sources_used: string[];
  total_found: number;
  errors?: string[];
}

// Data Quality Badge Component
const DataQualityBadge = ({ prospect }: { prospect: any }) => {
  const calculateScore = (prospect: any): number => {
    let score = 0;
    
    // Data completeness (40 points)
    if (prospect.email) score += 15;
    if (prospect.phone) score += 15;
    if (prospect.website) score += 10;
    
    // Data quality (30 points)
    if (prospect.confidence_score > 0.8) score += 20;
    if (prospect.description && prospect.description.length > 20) score += 10;
    
    // Source reliability (30 points)
    if (prospect.source === 'linkedin') score += 25;
    if (prospect.source === 'crunchbase') score += 25;
    if (prospect.source === 'enhanced_mock') score += 20;
    if (prospect.source === 'pages_jaunes') score += 15;
    if (prospect.source === 'yelp') score += 15;
    
    return Math.min(score, 100);
  };

  const score = calculateScore(prospect);
  const getVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const getColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Badge variant={getVariant(score)} className={getColor(score)}>
      {score}/100
    </Badge>
  );
};

export function GenerateAIListModal({ open, onOpenChange, onSuccess }: GenerateAIListModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'form' | 'generating' | 'preview' | 'importing'>('form');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({
    name: true,
    email: true,
    phone: true,
    address: true,
    website: true,
    description: true,
    category: true,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      industry: "",
      location: "",
      targetCount: 50,
      listName: "",
    }
  });

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    setCurrentStep('generating');
    setProgress(0);
    
    try {
      // Enhanced generation steps for intelligent search
      const steps = [
        "🔍 Recherche intelligente multi-sources...",
        "📊 Extraction job boards et annuaires...",
        "⏱️ Gestion des limites de taux...",
        "✅ Validation et nettoyage des données...",
        "🎯 Calcul des scores de qualité...",
        "✨ Préparation de l'aperçu finalisé...",
      ];

      for (let i = 0; i < steps.length; i++) {
        setGenerationStep(steps[i]);
        setProgress((i + 1) * (100 / steps.length)); // Dynamic progress based on number of steps
        await new Promise(resolve => setTimeout(resolve, 1500)); // Slightly longer for rate limiting
      }

      // Call API to generate prospects (preview mode)
      const response = await fetch("/api/prospects/generate-ai-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          industry: values.industry,
          location: values.location,
          targetCount: values.targetCount,
          listName: values.listName,
          preview: true, // Request preview data
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate prospects");
      }
      
      // Set preview data and move to preview step
      setPreviewData(data.previewData);
      setCurrentStep('preview');
      
    } catch (error: any) {
      toast.error(error.message || "Échec de la génération des prospects");
      setCurrentStep('form');
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
      setProgress(0);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;
    
    setIsGenerating(true);
    setCurrentStep('importing');
    
    try {
      // Call API to import with selected columns
      const response = await fetch("/api/prospects/generate-ai-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          industry: form.getValues("industry"),
          location: form.getValues("location"),
          targetCount: form.getValues("targetCount"),
          listName: form.getValues("listName"),
          selectedColumns,
          previewData: previewData,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to import prospects");
      }
      
      toast.success(`${data.generatedCount} prospects importés avec succès`);
      onOpenChange(false);
      onSuccess();
      form.reset();
      setCurrentStep('form');
      setPreviewData(null);
    } catch (error: any) {
      toast.error(error.message || "Échec de l'importation des prospects");
      setCurrentStep('preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleIndustryChange = (industry: string) => {
    form.setValue("industry", industry);
    // Auto-generate list name
    if (!form.getValues("listName")) {
      form.setValue("listName", `Prospects ${industry} - ${form.getValues("location") || "Localisation"}`);
    }
  };

  const handleLocationChange = (location: string) => {
    form.setValue("location", location);
    // Auto-generate list name
    if (!form.getValues("listName")) {
      form.setValue("listName", `Prospects ${form.getValues("industry") || "Industrie"} - ${location}`);
    }
  };

  const columnLabels: Record<string, string> = {
    name: "Nom",
    email: "Email",
    phone: "Téléphone",
    address: "Adresse",
    website: "Site web",
    description: "Description",
    category: "Catégorie",
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            {currentStep === 'preview' ? 'Aperçu des Données' : 'Générer Liste avec IA'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'preview' 
              ? 'Vérifiez les données extraites et sélectionnez les colonnes à importer'
              : 'Utilisez l\'intelligence artificielle pour créer automatiquement une liste de prospects basée sur l\'industrie et la localisation sélectionnées.'
            }
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'form' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Industrie
                      </FormLabel>
                      <Select onValueChange={handleIndustryChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une industrie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Localisation
                      </FormLabel>
                      <Select onValueChange={handleLocationChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une ville" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="targetCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Nombre de prospects ciblés
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="10"
                        max="500"
                        placeholder="50"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-muted-foreground">
                      Recommandé: 50-100 prospects pour de meilleurs résultats
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="listName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la liste</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de votre liste de prospects" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preview */}
              {form.watch("industry") && form.watch("location") && (
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Aperçu de la génération</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {form.watch("industry")}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {form.watch("location")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Recherche dans les annuaires professionnels pour {form.watch("targetCount")} prospects
                    </p>
                    <p className="text-muted-foreground">
                      Sources: Pages Jaunes, Yelp, annuaires spécialisés
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isGenerating}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Générer Prospects
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {currentStep === 'generating' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-purple-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Génération en cours...</h3>
                <p className="text-sm text-muted-foreground">{generationStep}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Steps indicator */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className={progress >= 25 ? "text-green-600" : "text-muted-foreground"}>
                  Recherche dans les annuaires
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className={progress >= 50 ? "text-green-600" : "text-muted-foreground"}>
                  Extraction des données
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className={progress >= 75 ? "text-green-600" : "text-muted-foreground"}>
                  Validation des données
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className={progress >= 100 ? "text-green-600" : "text-muted-foreground"}>
                  Création de la liste
                </span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'preview' && previewData && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Résumé de l'extraction
                </CardTitle>
                <CardDescription>
                  {previewData.total_found} prospects trouvés dans {previewData.sources_used.join(', ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {previewData.sources_used.map((source) => (
                    <Badge key={source} variant="outline">
                      {source}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Column Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Sélection des colonnes</CardTitle>
                <CardDescription>
                  Choisissez les colonnes que vous souhaitez importer dans votre liste
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(columnLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={selectedColumns[key]}
                        onCheckedChange={() => toggleColumn(key)}
                      />
                      <label
                        htmlFor={key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Aperçu des données</CardTitle>
                <CardDescription>
                  Aperçu des 10 premiers prospects (sur {previewData.total_found})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-hidden">
                  <div className="overflow-x-auto max-w-full">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          {selectedColumns.name && (
                            <TableHead className="w-[150px] min-w-[120px]">Nom</TableHead>
                          )}
                          {selectedColumns.email && (
                            <TableHead className="w-[180px] min-w-[150px]">Email</TableHead>
                          )}
                          {selectedColumns.phone && (
                            <TableHead className="w-[140px] min-w-[120px]">Téléphone</TableHead>
                          )}
                          {selectedColumns.address && (
                            <TableHead className="w-[200px] min-w-[150px]">Adresse</TableHead>
                          )}
                          {selectedColumns.website && (
                            <TableHead className="w-[160px] min-w-[120px]">Site web</TableHead>
                          )}
                          {selectedColumns.description && (
                            <TableHead className="w-[180px] min-w-[150px]">Description</TableHead>
                          )}
                          {selectedColumns.category && (
                            <TableHead className="w-[120px] min-w-[100px]">Catégorie</TableHead>
                          )}
                          <TableHead className="w-[100px] min-w-[80px]">Source</TableHead>
                          <TableHead className="w-[80px] min-w-[60px]">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.prospects.slice(0, 10).map((prospect, index) => (
                          <TableRow key={index}>
                            {selectedColumns.name && (
                              <TableCell className="font-medium truncate max-w-[150px]" title={prospect.name}>
                                {prospect.name}
                              </TableCell>
                            )}
                            {selectedColumns.email && (
                              <TableCell className="truncate max-w-[180px]" title={prospect.email || '-'}>
                                {prospect.email || '-'}
                              </TableCell>
                            )}
                            {selectedColumns.phone && (
                              <TableCell className="truncate max-w-[140px]" title={prospect.phone || '-'}>
                                {prospect.phone || '-'}
                              </TableCell>
                            )}
                            {selectedColumns.address && (
                              <TableCell className="truncate max-w-[200px]" title={prospect.address || '-'}>
                                {prospect.address || '-'}
                              </TableCell>
                            )}
                            {selectedColumns.website && (
                              <TableCell className="truncate max-w-[160px]">
                                {prospect.website ? (
                                  <a 
                                    href={prospect.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:underline truncate block"
                                    title={prospect.website}
                                  >
                                    {prospect.website.length > 20 ? `${prospect.website.substring(0, 20)}...` : prospect.website}
                                  </a>
                                ) : '-'}
                              </TableCell>
                            )}
                            {selectedColumns.description && (
                              <TableCell className="truncate max-w-[180px]" title={prospect.description || '-'}>
                                {prospect.description || '-'}
                              </TableCell>
                            )}
                            {selectedColumns.category && (
                              <TableCell className="truncate max-w-[120px]" title={prospect.category || '-'}>
                                {prospect.category || '-'}
                              </TableCell>
                            )}
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {prospect.source}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DataQualityBadge prospect={prospect} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep('form')}
                disabled={isGenerating}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button
                onClick={handleImport}
                disabled={isGenerating || Object.values(selectedColumns).every(v => !v)}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importation...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Importer {Object.values(selectedColumns).filter(Boolean).length} colonnes
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {currentStep === 'importing' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Importation en cours...</h3>
                <p className="text-sm text-muted-foreground">
                  Création de la liste et importation des prospects sélectionnés
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
