"use client";
import * as React from "react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { upsertUserEmailCredentials, getUserEmailCredentials } from "@/lib/user-email-credentials";

interface Props {
  userId: string;
  open: boolean;
  onClose: () => void;
  userEmail: string;
}

export default function EditUserEmailCredentialsModal({ userId, open, onClose, userEmail }: Props) {
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("2025/SUZALI@");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("2025/SUZALI@");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    if (open && userId && !loaded) {
      getUserEmailCredentials(userId).then(creds => {
        if (creds) {
          setImapUsername(creds.imap_username);
          setImapPassword(creds.imap_password);
          setSmtpUsername(creds.smtp_username);
          setSmtpPassword(creds.smtp_password);
        } else {
          setImapUsername(userEmail);
          setSmtpUsername(userEmail);
        }
        setLoaded(true);
      });
    }
    if (!open) {
      setLoaded(false);
    }
  }, [open, userId, loaded, userEmail]);

  const handleSave = async () => {
    setLoading(true);
    await upsertUserEmailCredentials(
      userId,
      imapUsername,
      imapPassword,
      smtpUsername,
      smtpPassword
    );
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Email Credentials</DialogTitle>
          <DialogDescription>
            Configure IMAP/SMTP settings for {userEmail}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>IMAP Username</Label>
            <Input 
              value={imapUsername} 
              onChange={e => setImapUsername(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>IMAP Password</Label>
            <Input 
              type="password" 
              value={imapPassword} 
              readOnly
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label>SMTP Username</Label>
            <Input 
              value={smtpUsername} 
              onChange={e => setSmtpUsername(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>SMTP Password</Label>
            <Input 
              type="password" 
              value={smtpPassword} 
              readOnly
              placeholder="••••••••"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
