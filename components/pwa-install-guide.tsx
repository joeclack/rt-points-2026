"use client";

import {
  Download,
  EllipsisVertical,
  Share2,
  Smartphone,
  SquarePlus,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "tjg-pwa-install-guide-v1";

type PhonePlatform = "android" | "ios";

function getPhonePlatform(): PhonePlatform | null {
  const userAgent = navigator.userAgent;
  const isIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  if (/iPhone|iPad|iPod/i.test(userAgent) || isIPadOS) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return null;
}

function isRunningAsInstalledApp() {
  const standaloneNavigator = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    standaloneNavigator.standalone === true
  );
}

export function PwaInstallGuide() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<PhonePlatform | null>(null);

  useEffect(() => {
    let hasViewedGuide = false;

    try {
      hasViewedGuide = window.localStorage.getItem(STORAGE_KEY) === "viewed";
    } catch {
      // Browsers with restricted storage can still show the guide this session.
    }

    if (hasViewedGuide || isRunningAsInstalledApp()) return;

    const detectedPlatform = getPhonePlatform();
    if (!detectedPlatform) return;

    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, "viewed");
      } catch {
        // The dialog remains useful even when the preference cannot persist.
      }

      setPlatform(detectedPlatform);
      setOpen(true);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, []);

  const steps =
    platform === "ios"
      ? [
          {
            icon: Share2,
            title: "Open the Share menu",
            detail: "Tap the Share button in your browser toolbar.",
          },
          {
            icon: SquarePlus,
            title: "Choose Add to Home Screen",
            detail: "Scroll through the actions if the option is not visible.",
          },
          {
            icon: Download,
            title: "Tap Add",
            detail: "TJG Tournaments will appear on your Home Screen.",
          },
        ]
      : [
          {
            icon: EllipsisVertical,
            title: "Open the browser menu",
            detail: "Tap the three-dot menu in the corner of your browser.",
          },
          {
            icon: Download,
            title: "Choose Install app",
            detail: "It may also be labelled Add to Home screen.",
          },
          {
            icon: Smartphone,
            title: "Confirm the installation",
            detail: "TJG Tournaments will be added to your phone.",
          },
        ];

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="max-w-md p-0">
        <div className="border-b border-slate-200 px-5 pb-5 pt-6 pr-12 sm:px-6 sm:pb-6 sm:pt-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-cyan-300">
            <Smartphone className="h-6 w-6" />
          </div>
          <DialogHeader className="mb-0">
            <DialogTitle>Get TJG Tournaments on your phone</DialogTitle>
            <DialogDescription>
              Add it to your Home Screen for quick access during tournaments.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <ol className="divide-y divide-slate-100">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <li className="flex gap-3 py-4" key={step.title}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-sm font-bold text-cyan-800">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                      <p className="font-semibold text-slate-950">{step.title}</p>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      {step.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <Button className="mt-2 w-full" onClick={() => setOpen(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
