export type ProfileName =
  | "core"
  | "operational"
  | "status-profile"
  | "ui-profile"
  | "mcp-profile"
  | "auth-profile"
  | "flow-insights"
  | "agent-work";

export type UiMode = "spa" | "ssr" | "server-rendered";

export type StackMetadata = {
  language?: string;
  framework?: string;
  interface?: string;
  contractProfiles?: ProfileName[];
  capabilities?: {
    status?: {
      enabled?: boolean;
    };
    ui?: {
      enabled?: boolean;
      mode?: UiMode;
    };
    mcp?: {
      enabled?: boolean;
    };
    auth?: {
      enabled?: boolean;
    };
    flowInsights?: {
      enabled?: boolean;
    };
    agentWork?: {
      enabled?: boolean;
    };
  };
};

export type ContractContext = {
  webBaseUrl: URL;
  bffBaseUrl: URL;
  mcpBaseUrl: URL;
  stackMetadata: StackMetadata | null;
};

export type TestCase = {
  name: string;
  run: () => Promise<void>;
};

export type ResponsePayload = {
  status: number;
  headers: Record<string, string>;
  body: string;
};
