"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface SyncResult {
  success: boolean;
  synced: number;
  errors: number;
  error?: {
    type: string;
    message: string;
    userMessage: string;
    solution: string;
  };
  warnings?: string[];
  folder?: string;
}

interface DiagnosticReport {
  timestamp: string;
  config: {
    id: string;
    email: string;
    provider: string;
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
  };
  summary: {
    totalSynced: number;
    totalErrors: number;
    foldersSynced: number;
    successRate: number;
  };
  folderResults: SyncResult[];
  recommendations: string[];
}

interface SyncDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostic: DiagnosticReport | null;
}

export function SyncDiagnosticModal({ isOpen, onClose, diagnostic }: SyncDiagnosticModalProps) {
  if (!diagnostic) return null;

  const getStatusIcon = (result: SyncResult) => {
    if (result.success) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (result.errors > 0) return <AlertCircle className="w-4 h-4 text-orange-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusColor = (result: SyncResult) => {
    if (result.success) return 'text-green-700 bg-green-50 border-green-200';
    if (result.errors > 0) return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const getProviderHelpLink = (provider: string) => {
    const links: { [key: string]: string } = {
      'gmail.com': 'https://support.google.com/accounts/answer/185833',
      'outlook.com': 'https://support.microsoft.com/fr-fr/account-billing/probl%C3%A8mes-de-connexion-%C3%A0-outlook-com-79ef7b9a5c68',
      'yahoo.com': 'https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html',
      'icloud.com': 'https://support.apple.com/fr-fr/HT204397'
    };
    return links[provider] || null;
  };

  const helpLink = getProviderHelpLink(diagnostic.config.provider);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Rapport de diagnostic de synchronisation
          </DialogTitle>
          <DialogDescription>
            Détails de la dernière synchronisation d'emails pour {diagnostic.config.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{diagnostic.summary.totalSynced}</div>
                  <div className="text-sm text-gray-600">Emails synchronisés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{diagnostic.summary.totalErrors}</div>
                  <div className="text-sm text-gray-600">Erreurs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{diagnostic.summary.foldersSynced}</div>
                  <div className="text-sm text-gray-600">Dossiers traités</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{diagnostic.summary.successRate}%</div>
                  <div className="text-sm text-gray-600">Taux de succès</div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <strong>Dernière synchronisation:</strong> {new Date(diagnostic.timestamp).toLocaleString('fr-FR')}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Email:</strong> {diagnostic.config.email}
                </div>
                <div>
                  <strong>Fournisseur:</strong> {diagnostic.config.provider}
                </div>
                <div>
                  <strong>Serveur IMAP:</strong> {diagnostic.config.imapHost}:{diagnostic.config.imapPort}
                </div>
                <div>
                  <strong>Serveur SMTP:</strong> {diagnostic.config.smtpHost}:{diagnostic.config.smtpPort}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Folder Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Résultats par dossier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diagnostic.folderResults.map((result, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${getStatusColor(result)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result)}
                        <span className="font-medium">{result.folder}</span>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {result.synced} synchronisé(s)
                        </Badge>
                        {result.errors > 0 && (
                          <Badge variant="outline" className="text-xs text-red-600">
                            {result.errors} erreur(s)
                          </Badge>
                        )}
                      </div>
                    </div>

                    {result.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <div className="font-medium text-red-800">{result.error.userMessage}</div>
                        <div className="text-red-700 mt-1">{result.error.solution}</div>
                      </div>
                    )}

                    {result.warnings && result.warnings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {result.warnings.map((warning, wIndex) => (
                          <div key={wIndex} className="text-sm text-orange-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {diagnostic.recommendations && diagnostic.recommendations.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Recommandations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {diagnostic.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-blue-700">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {recommendation}
                    </li>
                  ))}
                </ul>

                {helpLink && (
                  <div className="mt-4 p-3 bg-white border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">
                        Besoin d'aide pour configurer votre compte {diagnostic.config.provider} ?
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(helpLink, '_blank')}
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Guide d'aide
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Common Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Problèmes courants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="font-medium text-yellow-800">Erreur d'authentification</div>
                  <div className="text-yellow-700 mt-1">
                    Pour Gmail, activez l'authentification à deux facteurs et générez un mot de passe d'application.
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-800">Problème de connexion</div>
                  <div className="text-blue-700 mt-1">
                    Vérifiez votre connexion internet et les paramètres du serveur.
                  </div>
                </div>

                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="font-medium text-orange-800">Timeout</div>
                  <div className="text-orange-700 mt-1">
                    Les connexions prennent du temps. Réessayez pendant les heures creuses.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
