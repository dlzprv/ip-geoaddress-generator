import { useState, useEffect } from "react";
import type { TempMailMessage } from "@/app/types";

interface UseCloudflareMailReturn {
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

const WORKER_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || "https://email.yourdomain.com";

export default function useCloudflareMail(): UseCloudflareMailReturn {
  const [tempEmail, setTempEmail] = useState<string>("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [messages, setMessages] = useState<TempMailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<TempMailMessage | null>(null);
  const [toastMessage, setToastMessage] = useState<TempMailMessage | null>(null);
  const [domains, setDomains] = useState<{ id: string; domain: string }[]>([]);
  const [customUsername, setCustomUsername] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const customDomains = [
      { id: "custom-1", domain: "qingqiao.qzz.io" },
    ];
    setDomains(customDomains);
    setSelectedDomain(customDomains[0].domain);
  }, []);

  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const fetchEmails = async (email: string) => {
    try {
      const response = await fetch(`${WORKER_URL}/api/emails?address=${encodeURIComponent(email)}`);
      if (response.ok) {
        const emails = await response.json();
        setMessages(emails);
        
        if (emails.length > messages.length) {
          const newEmail = emails[0];
          setToastMessage(newEmail);
        }
      }
    } catch (error) {
      console.error("获取邮件失败:", error);
    }
  };

  const createCustomEmail = async () => {
    if (!customUsername || !selectedDomain) {
      return;
    }

    setEmailLoading(true);
    try {
      const email = `${customUsername}@${selectedDomain}`.toLowerCase();
      
      const response = await fetch(`${WORKER_URL}/api/create-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: email }),
      });

      if (response.ok) {
        setTempEmail(email);
        setMessages([]);
        
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        
        const interval = setInterval(() => {
          fetchEmails(email);
        }, 5000);
        
        setPollInterval(interval);
        
        fetchEmails(email);
      } else {
        const error = await response.json();
        console.error("创建邮箱失败:", error);
      }
    } catch (error) {
      console.error("创建邮箱失败:", error);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleMessageClick = async (msg: TempMailMessage) => {
    setSelectedMessage(msg);
  };

  return {
    tempEmail,
    emailLoading,
    messages,
    selectedMessage,
    toastMessage,
    domains,
    customUsername,
    selectedDomain,
    setSelectedMessage,
    setToastMessage,
    handleMessageClick,
    setCustomUsername,
    setSelectedDomain,
    createCustomEmail,
  };
}
