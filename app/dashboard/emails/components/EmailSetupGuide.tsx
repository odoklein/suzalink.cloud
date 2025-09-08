"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Server, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { translations as t } from '../translations';

interface EmailSetupGuideProps {
  onSetupClick: () => void;
}

export function EmailSetupGuide({ onSetupClick }: EmailSetupGuideProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const emailProviders = [
    {
      name: 'Gmail',
      icon: '📧',
      imap: {
        host: 'imap.gmail.com',
        port: 993,
        secure: true
      },
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false
      },
      note: 'Requires App Password (2FA must be enabled)'
    },
    {
      name: 'Outlook/Hotmail',
      icon: '📮',
      imap: {
        host: 'outlook.office365.com',
        port: 993,
        secure: true
      },
      smtp: {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false
      },
      note: 'Use your regular password'
    },
    {
      name: 'Yahoo',
      icon: '📬',
      imap: {
        host: 'imap.mail.yahoo.com',
        port: 993,
        secure: true
      },
      smtp: {
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false
      },
      note: 'Requires App Password'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <Mail className="w-16 h-16 mx-auto mb-4 text-blue-500" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.emailSetup}</h1>
        <p className="text-gray-600 mb-6">
          {t.connectYourEmailAccounts}
        </p>
        <Button onClick={onSetupClick} size="lg" className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          {t.addEmailAccount}
        </Button>
      </div>

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            {t.quickSetupGuide}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">1</div>
              <h3 className="font-semibold mb-1">{t.chooseProvider}</h3>
              <p className="text-sm text-gray-600">{t.selectYourEmailProvider}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">2</div>
              <h3 className="font-semibold mb-1">{t.enterSettings}</h3>
              <p className="text-sm text-gray-600">{t.useProvidedServerSettings}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">3</div>
              <h3 className="font-semibold mb-1">{t.testAndConnect}</h3>
              <p className="text-sm text-gray-600">{t.testConnectionAndStartSyncing}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Provider Settings */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">{t.popularEmailProviders}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emailProviders.map((provider) => (
            <Card key={provider.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{provider.icon}</span>
                  {provider.name}
                </CardTitle>
                {provider.note && (
                  <Badge variant="outline" className="w-fit">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {provider.note}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* IMAP Settings */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-1">
                    <Server className="w-4 h-4" />
                    IMAP (Entrant)
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Hôte :</span>
                      <div className="flex items-center gap-1">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {provider.imap.host}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(provider.imap.host)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Port :</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {provider.imap.port}
                      </code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">SSL/TLS :</span>
                      <Badge variant={provider.imap.secure ? "default" : "secondary"}>
                        {provider.imap.secure ? "Oui" : "Non"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* SMTP Settings */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    SMTP (Sortant)
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Hôte :</span>
                      <div className="flex items-center gap-1">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {provider.smtp.host}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(provider.smtp.host)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Port :</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {provider.smtp.port}
                      </code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">SSL/TLS :</span>
                      <Badge variant={provider.smtp.secure ? "default" : "secondary"}>
                        {provider.smtp.secure ? "Oui" : "Non"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Security Note */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Shield className="w-5 h-5" />
            {t.securityNote}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700">
          <p className="mb-2">
            {t.securityMessage}
          </p>
          <p>
            {t.appPasswordMessage}
          </p>
        </CardContent>
      </Card>

      {/* Help Links */}
      <Card>
        <CardHeader>
          <CardTitle>{t.needHelp}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Mot de passe d'application Gmail</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://support.google.com/accounts/answer/185833', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {t.setupGuide}
              </Button>
            </div>
            <div>
              <h4 className="font-medium mb-2">Mot de passe d'application Yahoo</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {t.setupGuide}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
