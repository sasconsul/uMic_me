import { useState } from "react";
import { Shield, KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const SECRET_STORAGE_KEY = "feature-board-admin-secret";

export function loadAdminSecret(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(SECRET_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveAdminSecret(secret: string) {
  try {
    if (secret) {
      localStorage.setItem(SECRET_STORAGE_KEY, secret);
    } else {
      localStorage.removeItem(SECRET_STORAGE_KEY);
    }
  } catch {}
}

interface AdminUnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminSecret: string;
  onSecretChange: (secret: string) => void;
}

export function AdminUnlockModal({
  open,
  onOpenChange,
  adminSecret,
  onSecretChange,
}: AdminUnlockModalProps) {
  const [input, setInput] = useState(adminSecret);
  const { toast } = useToast();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setInput(adminSecret);
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    const trimmed = input.trim();
    saveAdminSecret(trimmed);
    onSecretChange(trimmed);
    onOpenChange(false);
    if (trimmed) {
      toast({ title: "Admin mode enabled", description: "You can now update feature request statuses." });
    } else {
      toast({ title: "Admin mode disabled" });
    }
  };

  const handleLock = () => {
    setInput("");
    saveAdminSecret("");
    onSecretChange("");
    onOpenChange(false);
    toast({ title: "Admin mode disabled" });
  };

  const isUnlocked = !!adminSecret;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {isUnlocked ? "Admin Mode Active" : "Admin Unlock"}
          </DialogTitle>
          <DialogDescription>
            {isUnlocked
              ? "You're in admin mode. Status controls are visible on each request. Enter a new key or lock to exit."
              : "Enter your admin secret to enable inline status controls on each feature request."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <label htmlFor="admin-secret-input" className="text-sm font-medium">
              Admin Secret
            </label>
          </div>
          <Input
            id="admin-secret-input"
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter admin secret"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            data-testid="admin-modal-input"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Saved to this browser only.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isUnlocked && (
            <Button
              variant="ghost"
              onClick={handleLock}
              className="text-destructive hover:text-destructive"
              data-testid="admin-modal-lock"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Lock
            </Button>
          )}
          <Button onClick={handleSave} data-testid="admin-modal-save">
            {isUnlocked ? "Update Key" : "Unlock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
