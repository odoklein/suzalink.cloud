"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ImportCsvModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  onSuccess: () => void;
}

interface ColumnMapping {
  [key: string]: string | string[];
}

interface CsvRow {
  [key: string]: string;
}

export function ImportCsvModal({ open, onOpenChange, listId, onSuccess }: ImportCsvModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Available prospect columns
  const prospectColumns = [
    { id: 'name', label: 'Nom de l\'entreprise', required: true },
    { id: 'email', label: 'Email', required: false },
    { id: 'phone', label: 'Téléphone', required: false },
    { id: 'industry', label: 'Secteur d\'activité', required: false },
    { id: 'website', label: 'Site web', required: false },
    { id: 'notes', label: 'Notes', required: false },
  ];

  // Available interlocuteur columns
  const interlocuteurColumns = [
    { id: 'interlocuteur_name', label: 'Nom de l\'interlocuteur', required: false },
    { id: 'interlocuteur_email', label: 'Email de l\'interlocuteur', required: false },
    { id: 'interlocuteur_phone', label: 'Téléphone de l\'interlocuteur', required: false },
    { id: 'interlocuteur_position', label: 'Poste de l\'interlocuteur', required: false },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Veuillez sélectionner un fichier CSV');
      return;
    }

    setFile(uploadedFile);
    parseCsvFile(uploadedFile);
  };

  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('Le fichier CSV doit contenir au moins un en-tête et une ligne de données');
        return;
      }

      // Parse headers
      const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      setHeaders(csvHeaders);

      // Parse data rows
      const data: CsvRow[] = [];
      for (let i = 1; i < Math.min(lines.length, 11); i++) { // Preview first 10 rows
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: CsvRow = {};
        csvHeaders.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
      setCsvData(data);
      setPreviewData(data);

      // Auto-map columns based on header names
      const autoMapping: ColumnMapping = {};
      csvHeaders.forEach(header => {
          const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('nom') || lowerHeader.includes('name') || lowerHeader.includes('entreprise')) {
          // Check if it's interlocuteur name or company name
          if (lowerHeader.includes('interlocuteur') || lowerHeader.includes('contact') || lowerHeader.includes('responsable')) {
            autoMapping[header] = 'interlocuteur_name';
          } else {
            autoMapping[header] = 'name';
          }
        } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
          // Check if it's interlocuteur email or company email
          if (lowerHeader.includes('interlocuteur') || lowerHeader.includes('contact') || lowerHeader.includes('responsable')) {
            autoMapping[header] = 'interlocuteur_email';
          } else {
            autoMapping[header] = 'email';
          }
        } else if (lowerHeader.includes('tel') || lowerHeader.includes('phone') || lowerHeader.includes('téléphone')) {
          // Check if it's interlocuteur phone or company phone
          if (lowerHeader.includes('interlocuteur') || lowerHeader.includes('contact') || lowerHeader.includes('responsable')) {
            autoMapping[header] = 'interlocuteur_phone';
          } else {
            autoMapping[header] = 'phone';
          }
        } else if (lowerHeader.includes('secteur') || lowerHeader.includes('industry') || lowerHeader.includes('activité')) {
          autoMapping[header] = 'industry';
        } else if (lowerHeader.includes('site') || lowerHeader.includes('website') || lowerHeader.includes('web')) {
          autoMapping[header] = 'website';
        } else if (lowerHeader.includes('note') || lowerHeader.includes('comment')) {
          autoMapping[header] = 'notes';
        } else if (lowerHeader.includes('poste') || lowerHeader.includes('position') || lowerHeader.includes('fonction')) {
          autoMapping[header] = 'interlocuteur_position';
        }
      });
      setColumnMapping(autoMapping);

      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file) return;

    setStep('importing');
    setLoading(true);

    try {
      // Read the full file
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const prospects = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row: CsvRow = {};
          csvHeaders.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          // Map CSV data to prospect format
          const prospect: any = {
            listId,
            status: 'none',
          };

          // Separate interlocuteur data
          const interlocuteurData: any = {};

          Object.entries(columnMapping).forEach(([csvColumn, prospectColumn]) => {
            if (prospectColumn && row[csvColumn]) {
              if (Array.isArray(prospectColumn)) {
                // Multiple CSV columns mapped to one prospect field
                const values = prospectColumn.map(col => row[col]).filter(val => val && val.trim());
                if (values.length > 0) {
                  const value = values.join(' ').trim();
                  if (prospectColumn[0].startsWith('interlocuteur_')) {
                    interlocuteurData[prospectColumn[0]] = value;
                  } else {
                    prospect[prospectColumn[0]] = value;
                  }
                }
              } else {
                // Single CSV column mapped to one prospect field
                if (prospectColumn.startsWith('interlocuteur_')) {
                  interlocuteurData[prospectColumn] = row[csvColumn];
                } else {
                  prospect[prospectColumn] = row[csvColumn];
                }
              }
            }
          });

          // Add interlocuteur data if any exists
          if (Object.keys(interlocuteurData).length > 0) {
            prospect.interlocuteur = interlocuteurData;
          }

          console.log('Mapped prospect:', prospect);
          console.log('Column mapping:', columnMapping);
          console.log('CSV row:', row);

          // Ensure required fields
          if (prospect.name) {
            prospects.push(prospect);
          } else {
            console.log('Skipping prospect - no name:', prospect);
          }
        }

        console.log('Sending prospects to API:', prospects.length, 'prospects');
        console.log('First prospect being sent:', prospects[0]);

        // Import prospects
        const res = await fetch('/api/prospects/import-csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prospects }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Erreur lors de l\'importation');
        }

        const result = await res.json();
        toast.success(`${result.imported} prospects importés avec succès`);
        
        // Reset form
        setFile(null);
        setCsvData([]);
        setHeaders([]);
        setColumnMapping({});
        setPreviewData([]);
        setStep('upload');
        onOpenChange(false);
        onSuccess();
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'importation');
      setStep('mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleColumnMappingChange = (csvColumn: string, prospectColumn: string) => {
    setColumnMapping(prev => {
      const newMapping = { ...prev };
      
      if (prospectColumn === 'ignore') {
        newMapping[csvColumn] = '';
        return newMapping;
      }
      
      // Check if this prospect column is already mapped to another CSV column
      const existingMapping = Object.entries(newMapping).find(([_, mappedCol]) => 
        mappedCol === prospectColumn || (Array.isArray(mappedCol) && mappedCol.includes(prospectColumn))
      );
      
      if (existingMapping) {
        const [existingCsvCol, existingMappedCol] = existingMapping;
        
        if (Array.isArray(existingMappedCol)) {
          // Add to existing array
          newMapping[existingCsvCol] = [...existingMappedCol, prospectColumn];
        } else {
          // Convert to array with both columns
          newMapping[existingCsvCol] = [existingMappedCol, prospectColumn];
        }
        
        // Remove the current column from mapping if it was previously mapped
        if (newMapping[csvColumn] && newMapping[csvColumn] !== prospectColumn) {
          delete newMapping[csvColumn];
        }
      } else {
        newMapping[csvColumn] = prospectColumn;
      }
      
      return newMapping;
    });
  };

  const renderStep = () => {
    switch (step) {
      case 'upload':
  return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Glissez-déposez votre fichier CSV ici ou cliquez pour sélectionner
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Sélectionner un fichier CSV
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              <p>Format attendu: CSV avec en-têtes</p>
              <p>Colonnes recommandées: Nom, Email, Téléphone, Secteur, Site web</p>
            </div>
          </div>
        );
        
      case 'mapping':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Mappage des colonnes</h4>
              <p className="text-sm text-gray-600 mb-4">
                Associez les colonnes de votre CSV aux champs de prospects. 
                <br />
                <span className="text-blue-600">💡 Astuce:</span> Vous pouvez mapper plusieurs colonnes au même champ (ex: "Prénom" + "Nom" → "Nom de l'entreprise")
              </p>
            </div>
            <div className="space-y-3">
              {headers.map(header => {
                const currentMapping = columnMapping[header];
                const isMappedToMultiple = Array.isArray(currentMapping);
                const isMapped = currentMapping && currentMapping !== '';
                
                return (
                  <div key={header} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{header}</Label>
                      <div className="text-xs text-gray-500 mt-1">
                        {previewData[0]?.[header] && (
                          <span>Exemple: {previewData[0][header]}</span>
                        )}
                        {isMappedToMultiple && (
                          <div className="text-blue-600 mt-1">
                            🔗 Combiné avec d'autres colonnes
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-48">
                      <Select
                        value={isMappedToMultiple ? currentMapping[0] : (currentMapping || 'ignore')}
                        onValueChange={(value) => handleColumnMappingChange(header, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un champ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ignore">Ignorer cette colonne</SelectItem>
                          {prospectColumns.map(col => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.label} {col.required && '*'}
                              {isMappedToMultiple && currentMapping.includes(col.id) && ' ✓'}
                            </SelectItem>
                          ))}
                          <div className="border-t my-1"></div>
                          <div className="px-2 py-1 text-xs font-medium text-gray-500">Interlocuteur</div>
                          {interlocuteurColumns.map(col => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.label}
                              {isMappedToMultiple && currentMapping.includes(col.id) && ' ✓'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
                    </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Retour
              </Button>
              <Button onClick={() => setStep('preview')}>
                Aperçu
              </Button>
                    </div>
                  </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Aperçu des données</h4>
              <p className="text-sm text-gray-600 mb-4">
                Vérifiez que les données sont correctement mappées
              </p>
            </div>
            <div className="max-h-64 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.entries(columnMapping).map(([csvCol, prospectCol]) => {
                      const fieldId = Array.isArray(prospectCol) ? prospectCol[0] : prospectCol;
                      const fieldLabel = prospectColumns.find(c => c.id === fieldId)?.label || csvCol;
                      const isMultiple = Array.isArray(prospectCol);
                      
                      return (
                        <th key={csvCol} className="px-3 py-2 text-left border-b">
                          {fieldLabel}
                          {isMultiple && (
                            <div className="text-xs text-blue-600">
                              ({prospectCol.length} colonnes)
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      {Object.entries(columnMapping).map(([csvCol, prospectCol]) => {
                        let displayValue = '';
                        
                        if (Array.isArray(prospectCol)) {
                          // Multiple columns combined
                          const values = prospectCol.map(col => row[col]).filter(val => val && val.trim());
                          displayValue = values.join(' ').trim();
                        } else {
                          // Single column
                          displayValue = row[csvCol] || '';
                        }
                        
                        return (
                          <td key={csvCol} className="px-3 py-2 border-b">
                            {displayValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
                <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Retour
                  </Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? 'Importation...' : 'Importer'}
                  </Button>
            </div>
          </div>
        );

      case 'importing':
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Importation en cours...</p>
                      </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des prospects depuis CSV</DialogTitle>
          <DialogDescription>
            Importez une liste de prospects depuis un fichier CSV
          </DialogDescription>
        </DialogHeader>
        
        {renderStep()}
        
        {step !== 'importing' && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
