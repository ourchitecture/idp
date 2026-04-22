import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { flowInferenceEngine } from "./inference";
import { adapterInputSchema } from "./schema";
import type {
  FlowSignal,
  FlowSignalConfidence,
  FlowSignalSeverity,
  FlowSignalStage,
} from "./inference/types";
import type { NormalizedActor, NormalizedOwnershipHint, Provider, ProviderAdapterInput } from "./types";

interface AdapterFixture {
  fixtureId: string;
  scenario?: string;
  provider?: Provider;
  description?: string;
  input: ProviderAdapterInput;
}

export type InsightAudience = "owner" | "actor" | "reviewer";

export interface FlowInsightRecord {
  insightId: string;
  signalId: string;
  provider: Provider;
  repositoryFullName: string;
  service?: string;
  team?: string;
  actors: string[];
  teams: string[];
  services: string[];
  summary: string;
  observedAt?: string;
  signal: FlowSignal;
  source: {
    fixtureId: string;
    scenario?: string;
    description?: string;
  };
}

export interface FlowInsightSummary {
  insightId: string;
  signalId: string;
  title: string;
  severity?: FlowSignalSeverity;
  confidence?: FlowSignalConfidence;
  provider: Provider;
  repository: {
    full_name: string;
  };
  scope?: {
    service?: string;
    team?: string;
    stage?: FlowSignalStage;
  };
  services: string[];
  teams: string[];
  actors: string[];
  summary: string;
  observedAt?: string;
}

export interface FlowInsightDetail extends FlowInsightSummary {
  explanation?: string;
  recommendedNextAction?: string;
  relatedEntities?: unknown[];
  source: FlowInsightRecord["source"];
}

export interface InsightFilters {
  provider?: string;
  repo?: string;
  team?: string;
  service?: string;
  actor?: string;
  audience?: InsightAudience;
}

const FIXTURE_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "schema/fixtures/provider-adapter-input",
);

function loadFixtureFile(fileName: string): AdapterFixture | null {
  const raw = fs.readFileSync(path.join(FIXTURE_DIR, fileName), "utf-8");
  const parsed = yaml.parse(raw) as Record<string, unknown>;

  const inputResult = adapterInputSchema.safeParse(parsed);
  if (!inputResult.success) {
    return null;
  }

  return {
    fixtureId: (parsed.fixture_id as string) ?? fileName.replace(/\.yaml$/i, ""),
    scenario: parsed.scenario as string | undefined,
    provider: (parsed.provider as Provider | undefined) ?? (parsed.repository as { provider?: Provider })?.provider,
    description: parsed.description as string | undefined,
    input: inputResult.data as ProviderAdapterInput,
  };
}

function collectActorNames(actors: NormalizedActor[]): string[] {
  const names = new Set<string>();
  for (const actor of actors) {
    if (actor.display_name) {
      names.add(actor.display_name);
    } else if (actor.provider_login) {
      names.add(actor.provider_login);
    }
  }
  return Array.from(names);
}

function collectTeams(input: ProviderAdapterInput, hint: NormalizedOwnershipHint | null): string[] {
  const teams = new Set<string>();

  for (const actor of input.actors) {
    for (const team of actor.team_memberships ?? []) {
      if (team) teams.add(team);
    }
  }

  for (const hintEntry of input.ownership_hints) {
    for (const team of hintEntry.owner_team_names ?? []) {
      if (team) teams.add(team);
    }
  }

  if (hint) {
    for (const team of hint.owner_team_names ?? []) {
      if (team) teams.add(team);
    }
  }

  return Array.from(teams);
}

function collectServices(input: ProviderAdapterInput, serviceFromSignal?: string): string[] {
  const services = new Set<string>();
  if (serviceFromSignal) services.add(serviceFromSignal);
  if (input.repository.full_name) services.add(input.repository.full_name);
  return Array.from(services);
}

function summarizeForAudience(signal: FlowSignal, audience?: InsightAudience): string {
  const base = signal.explanation ?? signal.title;
  if (!audience) {
    return base;
  }

  const action = signal.recommendedNextAction ?? "";
  if (action.length === 0) {
    return base;
  }

  const label = audience === "owner" ? "Owner focus" : audience === "reviewer" ? "Reviewer focus" : "Actor focus";
  return `${base} | ${label}: ${action}`;
}

function buildCatalog(): FlowInsightRecord[] {
  const files = fs.readdirSync(FIXTURE_DIR).filter((file) => file.endsWith(".yaml"));
  const records: FlowInsightRecord[] = [];

  for (const file of files) {
    const fixture = loadFixtureFile(file);
    if (!fixture) {
      continue;
    }

    const hint = fixture.input.ownership_hints[0] ?? null;
    const inference = flowInferenceEngine.infer(fixture.input, { now: new Date() });
    for (const signal of inference.signals) {
      const service = signal.scope?.service ?? fixture.input.repository.full_name ?? fixture.input.repository.provider_id;
      const teams = collectTeams(fixture.input, hint);
      records.push({
        insightId: `${fixture.fixtureId}:${signal.id}`,
        signalId: signal.id,
        provider: fixture.provider ?? fixture.input.repository.provider,
        repositoryFullName: fixture.input.repository.full_name,
        service: signal.scope?.service,
        team: signal.scope?.team ?? teams[0],
        actors: collectActorNames(fixture.input.actors),
        teams,
        services: collectServices(fixture.input, service),
        summary: summarizeForAudience(signal),
        observedAt: signal.observedAt,
        signal,
        source: {
          fixtureId: fixture.fixtureId,
          scenario: fixture.scenario,
          description: fixture.description,
        },
      });
    }
  }

  return records;
}

const CATALOG = buildCatalog();

function matchesFilter(value: string | undefined, filter?: string): boolean {
  if (!filter) return true;
  if (!value) return false;
  return value.toLowerCase().includes(filter.toLowerCase());
}

export function listFlowInsights(filters: InsightFilters): FlowInsightSummary[] {
  const audience = filters.audience as InsightAudience | undefined;

  return CATALOG.filter((record) => {
    if (!matchesFilter(record.provider, filters.provider)) return false;
    if (!matchesFilter(record.repositoryFullName, filters.repo)) return false;

    if (filters.service) {
      const serviceMatch = record.services.some((service) => matchesFilter(service, filters.service));
      if (!serviceMatch) return false;
    }

    if (filters.team) {
      const teamMatch = record.teams.some((team) => matchesFilter(team, filters.team));
      if (!teamMatch) return false;
    }

    if (filters.actor) {
      const actorMatch = record.actors.some((actor) => matchesFilter(actor, filters.actor));
      if (!actorMatch) return false;
    }

    return true;
  }).map((record) => ({
    insightId: record.insightId,
    signalId: record.signalId,
    title: record.signal.title,
    severity: record.signal.severity,
    confidence: record.signal.confidence,
    provider: record.provider,
    repository: {
      full_name: record.repositoryFullName,
    },
    scope: record.signal.scope,
    services: record.services,
    teams: record.teams,
    actors: record.actors,
    summary: summarizeForAudience(record.signal, audience),
    observedAt: record.observedAt,
  }));
}

export function findFlowInsightDetail(insightId: string, audience?: InsightAudience): FlowInsightDetail | null {
  const record = CATALOG.find((entry) => entry.insightId === insightId);
  if (!record) return null;

  return {
    insightId: record.insightId,
    signalId: record.signalId,
    title: record.signal.title,
    severity: record.signal.severity,
    confidence: record.signal.confidence,
    provider: record.provider,
    repository: {
      full_name: record.repositoryFullName,
    },
    scope: record.signal.scope,
    services: record.services,
    teams: record.teams,
    actors: record.actors,
    summary: summarizeForAudience(record.signal, audience),
    observedAt: record.observedAt,
    explanation: record.signal.explanation,
    recommendedNextAction: record.signal.recommendedNextAction,
    relatedEntities: record.signal.relatedEntities,
    source: record.source,
  };
}
