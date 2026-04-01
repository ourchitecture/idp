import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  mainSidebar: [
    "intro",
    {
      type: "category",
      label: "Architecture",
      items: [
        {
          type: "category",
          label: "Decisions",
          link: {
            type: "doc",
            id: "architecture/decisions/index",
          },
          items: [
            "architecture/decisions/intent-driven-architecture",
            "architecture/decisions/stack-layout-and-make-contract",
            "architecture/decisions/contract-harness-and-runtime-port-contract",
            "architecture/decisions/implementation-portfolio-and-support-tiers",
            "architecture/decisions/shared-capability-contract-and-conformance-profiles",
            "architecture/decisions/cross-platform-local-runtime-ux-baseline",
            "architecture/decisions/moon-required-proto-enhanced-toolchain-policy",
            "architecture/decisions/dependency-and-tooling-pinning-policy",
            "architecture/decisions/intent-specification-format",
            "architecture/decisions/container-build-strategy",
          ],
        },
        {
          type: "category",
          label: "Diagrams",
          link: {
            type: "doc",
            id: "architecture/diagrams/index",
          },
          items: [
            "architecture/diagrams/level-1-system-context",
            "architecture/diagrams/level-2-containers-go",
            "architecture/diagrams/level-2-containers-nodejs",
            "architecture/diagrams/level-3-component-bff",
          ],
        },
      ],
    },
    {
      type: "category",
      label: "Containers",
      link: {
        type: "doc",
        id: "containers/index",
      },
      items: [
        "containers/running",
        "containers/go-net-http-rest",
        "containers/nodejs-react-fastify-rest",
        "containers/contract-tests",
        "containers/versioning",
      ],
    },
    {
      type: "category",
      label: "Testing",
      link: {
        type: "doc",
        id: "testing/index",
      },
      items: [
        "testing/contract-harness",
        {
          type: "category",
          label: "Profiles",
          items: [
            "testing/profiles/core",
            "testing/profiles/operational",
            "testing/profiles/ui-profile",
          ],
        },
      ],
    },
  ],
};

export default sidebars;
