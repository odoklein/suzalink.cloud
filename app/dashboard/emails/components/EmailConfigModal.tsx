"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Server, 
  Shield, 
  TestTube, 
  CheckCircle2, 
  XCircle, 
  Trash2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { translations as t } from '../translations';

interface EmailConfig {
  id: string;
  emailAddress: string;
  displayName: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncFrequencyMinutes: number;
  createdAt: string;
}

interface EmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigAdded: () => void;
}

export function EmailConfigModal({ isOpen, onClose, onConfigAdded }: EmailConfigModalProps) {
  const [step, setStep] = useState<'form' | 'testing'>('form');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [formData, setFormData] = useState({
    emailAddress: '',
    displayName: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    imapUsername: '',
    imapPassword: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUsername: '',
    smtpPassword: '',
  });

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/emails/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailAddress: formData.emailAddress,
          imapHost: formData.imapHost,
          imapPort: formData.imapPort,
          imapSecure: formData.imapSecure,
          imapUsername: formData.imapUsername,
          imapPassword: formData.imapPassword,
          smtpHost: formData.smtpHost,
          smtpPort: formData.smtpPort,
          smtpSecure: formData.smtpSecure,
          smtpUsername: formData.smtpUsername,
          smtpPassword: formData.smtpPassword,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResult({ success: true, message: 'Connection test successful!' });
        toast.success('Email configuration test passed');
      } else {
        setTestResult({ success: false, message: result.error || 'Connection test failed' });
        toast.error('Email configuration test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({ success: false, message: 'Network error occurred' });
      toast.error('Error testing connection');
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/emails/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Email configuration saved successfully');
        onConfigAdded();
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Error saving configuration');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      emailAddress: '',
      displayName: '',
      imapHost: '',
      imapPort: 993,
      imapSecure: true,
      imapUsername: '',
      imapPassword: '',
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      smtpUsername: '',
      smtpPassword: '',
    });
    setStep('form');
    setTestResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t.emailConfiguration}
          </DialogTitle>
          <DialogDescription>
            {t.addNewEmailAccount}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t.basicInformation}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emailAddress">{t.emailAddress}</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    value={formData.emailAddress}
                    onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                    placeholder="votre@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">{t.displayName}</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    placeholder={t.yourName}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IMAP Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-4 h-4" />
                {t.imapSettings}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="imapHost">{t.imapHost}</Label>
                  <Input
                    id="imapHost"
                    value={formData.imapHost}
                    onChange={(e) => handleInputChange('imapHost', e.target.value)}
                    placeholder="imap.gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="imapPort">{t.port}</Label>
                  <Input
                    id="imapPort"
                    type="number"
                    value={formData.imapPort}
                    onChange={(e) => handleInputChange('imapPort', parseInt(e.target.value))}
                    placeholder="993"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="imapSecure"
                  checked={formData.imapSecure}
                  onCheckedChange={(checked) => handleInputChange('imapSecure', checked)}
                />
                <Label htmlFor="imapSecure">{t.useSSLTLS}</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="imapUsername">{t.username}</Label>
                  <Input
                    id="imapUsername"
                    value={formData.imapUsername}
                    onChange={(e) => handleInputChange('imapUsername', e.target.value)}
                    placeholder="votre@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="imapPassword">{t.password}</Label>
                  <Input
                    id="imapPassword"
                    type="password"
                    value={formData.imapPassword}
                    onChange={(e) => handleInputChange('imapPassword', e.target.value)}
                    placeholder={t.appPasswordOrRegularPassword}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMTP Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t.smtpSettings}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpHost">{t.smtpHost}</Label>
                  <Input
                    id="smtpHost"
                    value={formData.smtpHost}
                    onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPort">{t.port}</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={formData.smtpPort}
                    onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value))}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="smtpSecure"
                  checked={formData.smtpSecure}
                  onCheckedChange={(checked) => handleInputChange('smtpSecure', checked)}
                />
                <Label htmlFor="smtpSecure">{t.useSSLTLS}</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpUsername">{t.username}</Label>
                  <Input
                    id="smtpUsername"
                    value={formData.smtpUsername}
                    onChange={(e) => handleInputChange('smtpUsername', e.target.value)}
                    placeholder="votre@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPassword">{t.password}</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={formData.smtpPassword}
                    onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                    placeholder={t.appPasswordOrRegularPassword}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Connection */}
          {step === 'testing' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  {t.testConnection}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Button
                    onClick={testConnection}
                    disabled={testing}
                    className="flex items-center gap-2"
                  >
                    {testing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                    {testing ? t.testing : t.testConnection}
                  </Button>

                  {testResult && (
                    <div className={`flex items-center gap-2 ${
                      testResult.success ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm">{testResult.success ? t.connectionTestSuccessful : t.connectionTestFailed}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            {t.cancel}
          </Button>

          <div className="flex gap-2">
            {step === 'form' && (
              <Button
                variant="outline"
                onClick={() => setStep('testing')}
                disabled={!formData.emailAddress || !formData.imapHost || !formData.smtpHost}
              >
                {t.testConnection}
              </Button>
            )}

            {step === 'testing' && (
              <Button
                variant="outline"
                onClick={() => setStep('form')}
              >
                {t.backToForm}
              </Button>
            )}

            <Button
              onClick={saveConfiguration}
              disabled={loading || (step === 'testing' && !testResult?.success)}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {loading ? 'Enregistrement...' : t.saveConfiguration}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
