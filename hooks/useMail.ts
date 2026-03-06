import useCloudflareMail from "./useCloudflareMail";
import type { TempMailMessage } from "@/app/types";

interface UseMailReturn {
  tempEmail: string;
  emailLoading: boolean;
  messages: TempMailMessage[];
  selectedMessage: TempMailMessage | null;
  toastMessage: TempMailMessage | null;
  domains: { id: string; domain: string }[];
  customUsername: string;
  selectedDomain: string;
  setSelectedMessage: (message: TempMailMessage | null) => void;
  setToastMessage: (message: TempMailMessage | null) => void;
  handleMessageClick: (msg: TempMailMessage) => Promise<void>;
  setCustomUsername: (username: string) => void;
  setSelectedDomain: (domain: string) => void;
  createCustomEmail: () => Promise<void>;
}

export default function useMail(): UseMailReturn {
  return useCloudflareMail();
}
