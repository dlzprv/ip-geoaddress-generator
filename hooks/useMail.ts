import { useState, useEffect } from "react";
import Mailjs from "@cemalgnlts/mailjs";
import type { TempMailMessage, MailEvent } from "@/app/types";

interface Domain {
  id: string;
  domain: string;
}

interface UseMailReturn {
  tempEmail: string;
  emailLoading: boolean;
  messages: TempMailMessage[];
  selectedMessage: TempMailMessage | null;
  toastMessage: TempMailMessage | null;
  domains: Domain[];
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
  const [tempEmail, setTempEmail] = useState<string>("");
  const [emailLoading, setEmailLoading] = useState(true);
  const [messages, setMessages] = useState<TempMailMessage[]>([]);
  const [mailjs] = useState(new Mailjs());
  const [selectedMessage, setSelectedMessage] =
    useState<TempMailMessage | null>(null);
  const [toastMessage, setToastMessage] = useState<TempMailMessage | null>(
    null
  );
  const [domains, setDomains] = useState<Domain[]>([]);
  const [customUsername, setCustomUsername] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const result = await mailjs.getDomains();
        if (result.status && result.data.length > 0) {
          setDomains(result.data);
          setSelectedDomain(result.data[0].domain);
        }
      } catch (error) {
        console.error("获取域名列表失败:", error);
      }
    };

    fetchDomains();
  }, []);

  useEffect(() => {
    const createTempEmail = async () => {
      setEmailLoading(true);
      try {
        const account = await mailjs.createOneAccount();
        if (account.status) {
          setTempEmail(account.data.username);
          await mailjs.login(account.data.username, account.data.password);
          mailjs.on("arrive", async (message: MailEvent) => {
            const fullMessage = await mailjs.getMessage(message.id);
            if (fullMessage.status) {
              const source = await mailjs.getSource(message.id);
              const messageData = {
                ...fullMessage.data,
                source: {
                  id: source.data.id,
                  data: source.data.data,
                  downloadUrl: source.data.downloadUrl,
                },
              } as TempMailMessage;
              setMessages((prev) => [...prev, messageData]);
              setToastMessage(messageData);
            }
          });
        }
      } catch (error) {
        console.error("创建临时邮箱失败:", error);
      } finally {
        setEmailLoading(false);
      }
    };

    if (!tempEmail) {
      createTempEmail();
    }

    return () => {
      mailjs.off();
    };
  }, []);

  const createCustomEmail = async () => {
    if (!customUsername || !selectedDomain) {
      return;
    }

    setEmailLoading(true);
    try {
      mailjs.off();
      
      const email = `${customUsername}@${selectedDomain}`;
      const password = Math.random().toString(36).substring(7);
      
      const account = await mailjs.register(email, password);
      if (account.status) {
        setTempEmail(email);
        await mailjs.login(email, password);
        
        mailjs.on("arrive", async (message: MailEvent) => {
          const fullMessage = await mailjs.getMessage(message.id);
          if (fullMessage.status) {
            const source = await mailjs.getSource(message.id);
            const messageData = {
              ...fullMessage.data,
              source: {
                id: source.data.id,
                data: source.data.data,
                downloadUrl: source.data.downloadUrl,
              },
            } as TempMailMessage;
            setMessages((prev) => [...prev, messageData]);
            setToastMessage(messageData);
          }
        });
        
        setMessages([]);
      }
    } catch (error) {
      console.error("创建自定义邮箱失败:", error);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleMessageClick = async (msg: TempMailMessage) => {
    if (!msg.source) {
      try {
        const fullMessage = await mailjs.getMessage(msg.id);
        if (fullMessage.status) {
          const source = await mailjs.getSource(msg.id);
          const messageData = {
            ...fullMessage.data,
            source: {
              id: source.data.id,
              data: source.data.data,
              downloadUrl: source.data.downloadUrl,
            },
          } as TempMailMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? messageData : m))
          );
          setSelectedMessage(messageData);
        }
      } catch (error) {
        console.error("获取邮件内容失败:", error);
      }
    } else {
      setSelectedMessage(msg);
    }
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
