import { useState, useRef, ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClientSelect } from "./ClientSelect";
import { ContributorsSelect } from "./ContributorsSelect";
import { toast } from "sonner";
import { Upload, FileText, Check, AlertCircle, ArrowRight, ChevronRight, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Form schema for import CSV
const importCsvSchema = z.object({
  name: z.string().min(1, "Le nom de la liste est requis"),
  clientId: z.string().optional(),
  contributors: z.array(z.string()).optional(),
  existingListId: z.string().optional(),
  consent: z.boolean().optional(),
});

type ImportCsvValues = z.infer<typeof importCsvSchema>;

interface CreateListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateListModal({ open, onOpenChange, onSuccess }: CreateListModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // CSV Import states
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: string[][];
    totalRows: number;
  } | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [phoneColumns, setPhoneColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importForm = useForm<ImportCsvValues>({
    resolver: zodResolver(importCsvSchema),
    defaultValues: {
      name: "",
      clientId: undefined,
      contributors: [],
      existingListId: undefined,
      consent: false,
    }
  });

  // CSV Import helper functions
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Auto-fill list name from filename
    const fileName = selectedFile.name.replace(/\.csv$/, "");
    importForm.setValue("name", fileName);

    // Parse CSV for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const rows = parseCSV(csvText);

      if (rows.length > 0) {
        setPreview({
          headers: rows[0],
          rows: rows.slice(1, 6), // Show first 5 rows
          totalRows: rows.length - 1,
        });

        // Initialize mappings
        const initialMappings: Record<string, string> = {};
        const detectedPhoneColumns: string[] = [];

        rows[0].forEach((header) => {
          // Try to auto-detect column types
          const lowerHeader = header.toLowerCase();

          if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('tel')) {
            initialMappings[header] = 'phone';
            detectedPhoneColumns.push(header);
          } else if (lowerHeader.includes('name') && lowerHeader.includes('first')) {
            initialMappings[header] = 'first_name';
          } else if (lowerHeader.includes('name') && lowerHeader.includes('last')) {
            initialMappings[header] = 'last_name';
          } else if (lowerHeader === 'name' || lowerHeader === 'full name') {
            initialMappings[header] = 'name';
          } else if (lowerHeader.includes('email')) {
            initialMappings[header] = 'email';
          } else if (lowerHeader.includes('company')) {
            initialMappings[header] = 'company';
          } else {
            initialMappings[header] = header;
          }
        });

        setMappings(initialMappings);
        setPhoneColumns(detectedPhoneColumns);
        setSelectedColumns(rows[0]); // Select all columns by default
      }
    };
    reader.readAsText(selectedFile);
  };

  // Simple CSV parser
  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/);
    return lines
      .filter(line => line.trim())
      .map(line => {
        // Handle quoted fields with commas
        const result = [];
        let inQuotes = false;
        let field = "";

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(field);
            field = "";
          } else {
            field += char;
          }
        }

        result.push(field);
        return result;
      });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!file) {
        toast.error("Veuillez sélectionner un fichier CSV");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Check if at least one phone column is mapped
      if (phoneColumns.length === 0) {
        toast.error("Veuillez identifier au moins une colonne contenant des numéros de téléphone");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const togglePhoneColumn = (header: string) => {
    if (phoneColumns.includes(header)) {
      setPhoneColumns(phoneColumns.filter(col => col !== header));
    } else {
      setPhoneColumns([...phoneColumns, header]);
    }
  };

  const toggleColumnSelection = (header: string) => {
    if (selectedColumns.includes(header)) {
      setSelectedColumns(selectedColumns.filter(col => col !== header));
    } else {
      setSelectedColumns([...selectedColumns, header]);
    }
  };

  const selectAllColumns = () => {
    setSelectedColumns([...preview?.headers || []]);
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  // Import CSV submit handler
  const handleImportCsv = async (values: ImportCsvValues) => {
    if (!file || !preview) {
      toast.error("Veuillez sélectionner un fichier CSV");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Read file content
      const fileContent = await readFileAsText(file);
      const rows = parseCSV(fileContent);

      if (rows.length < 2) {
        throw new Error("Le fichier CSV doit contenir des en-têtes et au moins une ligne de données");
      }

      const headers = rows[0];
      const data = rows.slice(1).filter(row => row.length === headers.length);

      // Filter data to only include selected columns
      const selectedIndices = selectedColumns.map(col => headers.indexOf(col));
      const filteredHeaders = selectedColumns;
      const filteredData = data.map(row =>
        selectedIndices.map(index => row[index])
      );

      // Prepare column mappings for API (only for selected columns)
      const columnMappings = selectedColumns.map(header => mappings[header] || header);

      // Prepare request body
      const requestBody: any = {
        headers: filteredHeaders,
        data: filteredData,
        columnMappings,
        phoneColumns: phoneColumns.filter(col => selectedColumns.includes(col))
      };

      requestBody.listName = values.name;
      requestBody.clientId = values.clientId || null;
      requestBody.contributors = values.contributors || [];

      // Send to API
      const response = await fetch("/api/prospects/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to import CSV");
      }
      
      toast.success(`${responseData.importedCount} prospects importés avec succès`);
      onOpenChange(false);
      onSuccess();
      importForm.reset();
      setFile(null);
      setPreview(null);
      setStep(1);
    } catch (error: any) {
      toast.error(error.message || "Échec de l'importation du CSV");
    } finally {
      setIsSubmitting(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  return (
    <Dialog open={open}     onOpenChange={(newOpen) => {
      if (!newOpen) {
        // Reset all states when closing
        importForm.reset();
        setFile(null);
        setPreview(null);
        setStep(1);
        setSelectedColumns([]);
        setPhoneColumns([]);
        setMappings({});
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer Prospects depuis CSV</DialogTitle>
          <DialogDescription>
            Importez vos prospects depuis un fichier CSV
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
            {/* Step indicator for CSV import */}
            {step > 1 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      1
                    </div>
                    <div className={`h-1 w-12 mx-1 ${step > 1 ? 'bg-primary' : 'bg-muted'}`}></div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      2
                    </div>
                    <div className={`h-1 w-12 mx-1 ${step > 2 ? 'bg-primary' : 'bg-muted'}`}></div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      3
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {step === 1 && "Télécharger CSV"}
                    {step === 2 && "Mapper Colonnes"}
                    {step === 3 && "Confirmer Import"}
                  </div>
                </div>
              </div>
            )}

            {/* CSV Import Steps */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fichier CSV</label>
                  <div
                    className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors ${file ? 'border-primary/50' : 'border-muted'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB • {preview?.totalRows} prospects
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="mt-2">
                          Changer Fichier
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium text-primary">Cliquez pour télécharger</span> ou glissez-déposez
                        </div>
                        <p className="text-xs text-muted-foreground">Fichiers CSV uniquement</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Assurez-vous que votre fichier CSV contient le nom du contact et le numéro de téléphone
                  </p>
                </div>

                {/* Preview */}
                {preview && (
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-muted/50 p-3 text-sm font-medium flex items-center justify-between">
                      <span>Aperçu du fichier CSV</span>
                      <span className="text-xs text-muted-foreground">
                        {preview.headers.length} colonnes • {preview.totalRows} lignes
                      </span>
                    </div>

                    {/* Compact Preview - Show first 5 columns only */}
                    <div className="overflow-hidden">
                      <div className="min-w-0">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/30">
                              {preview.headers.slice(0, 5).map((header, i) => (
                                <th key={i} className="p-2 text-left font-medium max-w-[120px] truncate" title={header}>
                                  {header}
                                </th>
                              ))}
                              {preview.headers.length > 5 && (
                                <th className="p-2 text-left font-medium text-muted-foreground">
                                  +{preview.headers.length - 5} autres
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.rows.slice(0, 3).map((row, i) => (
                              <tr key={i} className="border-t border-muted/30">
                                {row.slice(0, 5).map((cell, j) => (
                                  <td key={j} className="p-2 max-w-[120px] truncate" title={cell}>
                                    {cell || '-'}
                                  </td>
                                ))}
                                {preview.headers.length > 5 && (
                                  <td className="p-2 text-muted-foreground text-xs">
                                    ...
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {(preview.totalRows > 3 || preview.headers.length > 5) && (
                      <div className="bg-muted/20 p-2 text-xs text-center text-muted-foreground border-t">
                        Aperçu limité • {preview.totalRows > 3 ? `${preview.totalRows - 3} lignes restantes` : ''}
                        {preview.totalRows > 3 && preview.headers.length > 5 ? ' • ' : ''}
                        {preview.headers.length > 5 ? `${preview.headers.length - 5} colonnes masquées` : ''}
                      </div>
                    )}
                  </div>
                )}

                {file && (
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="gap-1 bg-green-100 text-green-800 border-green-200">
                      <Check className="h-3 w-3" />
                      <span>Détection téléphone activée</span>
                    </Badge>
                    <Badge variant="default" className="gap-1 bg-blue-100 text-blue-800 border-blue-200">
                      <Check className="h-3 w-3" />
                      <span>Intégration Aircall prête</span>
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Map Columns */}
            {step === 2 && preview && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Configuration de l'importation</h3>
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez les colonnes à importer et identifiez celles contenant des numéros de téléphone
                  </p>
                </div>

                {/* Column Selection */}
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-muted/50 p-3 text-sm font-medium flex items-center justify-between">
                    <span>Sélection des colonnes à importer</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllColumns}
                        className="h-7 px-2 text-xs"
                        disabled={!preview}
                      >
                        Tout sélectionner
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deselectAllColumns}
                        className="h-7 px-2 text-xs"
                        disabled={!preview}
                      >
                        Tout désélectionner
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {preview.headers.map((header) => (
                        <div key={header} className="flex items-center gap-3 p-2 border rounded-md bg-slate-50/50">
                          <Checkbox
                            id={`select-${header}`}
                            checked={selectedColumns.includes(header)}
                            onCheckedChange={() => toggleColumnSelection(header)}
                            className="flex-shrink-0"
                          />
                          <label htmlFor={`select-${header}`} className="text-sm font-medium flex-1 truncate">
                            {header}
                          </label>
                          {selectedColumns.includes(header) && (
                            <Badge variant="default" className="text-xs flex-shrink-0 bg-green-100 text-green-800 border-green-200">
                              Sélectionnée
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t text-xs text-center text-muted-foreground">
                      {selectedColumns.length} colonne{selectedColumns.length > 1 ? 's' : ''} sélectionnée{selectedColumns.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Phone Column Detection */}
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-muted/50 p-3 text-sm font-medium">
                    Détection automatique des numéros de téléphone
                  </div>
                  <div className="p-3 space-y-3">
                    {preview.headers.filter(header => selectedColumns.includes(header)).map((header) => (
                      <div key={header} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2 flex-1">
                          <Checkbox
                            id={`phone-${header}`}
                            checked={phoneColumns.includes(header)}
                            onCheckedChange={() => togglePhoneColumn(header)}
                            disabled={!selectedColumns.includes(header)}
                          />
                          <label htmlFor={`phone-${header}`} className="text-sm font-medium flex-1">
                            {header}
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {phoneColumns.includes(header) ? 'Numéro téléphone' : 'Champ régulier'}
                          </span>
                          <div className={`w-3 h-3 rounded-full ${phoneColumns.includes(header) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/20 p-3 text-xs text-center text-muted-foreground">
                    Cochez les cases pour les colonnes contenant des numéros de téléphone
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      {phoneColumns.length === 0
                        ? "Veuillez identifier au moins une colonne contenant des numéros de téléphone"
                        : `${phoneColumns.length} colonne${phoneColumns.length > 1 ? 's' : ''} téléphone détectée${phoneColumns.length > 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirm Import */}
            {step === 3 && preview && (
              <div className="space-y-4">
                <Form {...importForm}>
                  <form onSubmit={importForm.handleSubmit(handleImportCsv)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Détails de l'importation</h3>
                        <div className="bg-muted/20 p-3 rounded-md">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Lignes totales:</span>
                            <span className="text-sm">{preview.totalRows}</span>
                          </div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Colonnes téléphone:</span>
                            <span className="text-sm">{phoneColumns.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Fichier:</span>
                            <span className="text-sm">{file?.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
            <FormField
                          control={importForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la Liste</FormLabel>
                  <FormControl>
                    <Input placeholder="Entrez le nom de la liste" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
                          control={importForm.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigner au Client (Optionnel)</FormLabel>
                  <FormControl>
                    <ClientSelect
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                          control={importForm.control}
              name="contributors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ajouter des Contributeurs (Optionnel)</FormLabel>
                  <FormControl>
                    <ContributorsSelect
                      value={field.value || []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <FormField
                        control={importForm.control}
                        name="consent"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Je confirme que j'ai le consentement pour contacter ces prospects
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {/* Navigation buttons */}
            {step === 1 && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!file}
                >
                  Suivant
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </DialogFooter>
            )}

            {step === 2 && (
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  Retour
                </Button>
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={phoneColumns.length === 0}
                >
                  Suivant
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </DialogFooter>
            )}

            {step === 3 && (
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  Retour
                </Button>
                <Button
                  onClick={importForm.handleSubmit(handleImportCsv)}
                  disabled={isSubmitting || !importForm.getValues().consent}
                >
                  {isSubmitting ? "Importation..." : "Importer Prospects"}
              </Button>
            </DialogFooter>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
