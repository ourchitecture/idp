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
          ],
        },
      ],
    },
    {
      type: "category",
      label: "Testing",
      link: {
        type: "doc",
        id: "testing/index",
      },
      items: ["testing/contract-harness"],
    },
  ],
};

export default sidebars;
