"use client";

import {
  TextField,
  Button,
  Select,
  Flex,
  Text,
  Card,
} from "@radix-ui/themes";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";

interface Domain {
  id: string;
  domain: string;
}

interface CustomEmailFormProps {
  domains: Domain[];
  customUsername: string;
  selectedDomain: string;
  emailLoading: boolean;
  onUsernameChange: (username: string) => void;
  onDomainChange: (domain: string) => void;
  onCreateEmail: () => void;
}

export function CustomEmailForm({
  domains,
  customUsername,
  selectedDomain,
  emailLoading,
  onUsernameChange,
  onDomainChange,
  onCreateEmail,
}: Readonly<CustomEmailFormProps>) {
  return (
    <Card size="2">
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2">
          <EnvelopeClosedIcon width="18" height="18" />
          <Text size="3" weight="medium">
            自定义邮箱
          </Text>
        </Flex>

        <Flex gap="2" align="end">
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray">
              用户名
            </Text>
            <TextField.Root
              placeholder="输入用户名"
              value={customUsername}
              onChange={(e) => onUsernameChange(e.target.value)}
              disabled={emailLoading}
            />
          </Flex>

          <Text size="4" weight="bold" style={{ marginBottom: "8px" }}>
            @
          </Text>

          <Flex direction="column" gap="1" style={{ width: "200px" }}>
            <Text size="1" color="gray">
              域名
            </Text>
            <Select.Root
              value={selectedDomain}
              onValueChange={onDomainChange}
              disabled={emailLoading}
            >
              <Select.Trigger style={{ width: "100%" }} />
              <Select.Content>
                {domains.map((domain) => (
                  <Select.Item key={domain.id} value={domain.domain}>
                    {domain.domain}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>

        <Button
          onClick={onCreateEmail}
          disabled={!customUsername || emailLoading}
          style={{ width: "100%" }}
        >
          {emailLoading ? "创建中..." : "创建自定义邮箱"}
        </Button>
      </Flex>
    </Card>
  );
}
