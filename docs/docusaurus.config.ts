import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const siteUrl = process.env.DOCS_SITE_URL ?? "https://stemix.dev";
const baseUrl = process.env.DOCS_BASE_URL ?? "/";

const config: Config = {
  title: "Stemix",
  tagline:
    "An AI-native Intelligent Development System with an Intent-Driven Portal",
  favicon: "img/favicon.ico",

  url: siteUrl,
  baseUrl: baseUrl,

  organizationName: "ourchitecture",
  projectName: "idp",

  onBrokenLinks: "throw",

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          path: "content",
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/ourchitecture/idp/edit/main/docs/",
        },
        blog: {
          showReadingTime: true,
          blogTitle: "Stemix Blog",
          blogDescription:
            "Thoughts on AI-native development, intent-driven portals, and the future of engineering platforms.",
          postsPerPage: "ALL",
          blogSidebarTitle: "Recent posts",
          blogSidebarCount: 5,
        },
        gtag: {
          trackingID: "G-DF7EEF2WEZ",
          anonymizeIP: true,
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: ["@docusaurus/theme-mermaid"],

  themeConfig: {
    image: "img/logo.svg",
    navbar: {
      title: "Stemix",
      logo: {
        alt: "Stemix Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "mainSidebar",
          position: "left",
          label: "Docs",
        },
        {
          href: "https://github.com/ourchitecture/idp",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Introduction",
              to: "/docs/intro",
            },
            {
              label: "Architecture Decisions",
              to: "/docs/architecture/decisions/",
            },
            {
              label: "Architecture Diagrams",
              to: "/docs/architecture/diagrams/",
            },
            {
              label: "Testing",
              to: "/docs/testing/",
            },
            {
              label: "Containers",
              to: "/docs/containers/",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/ourchitecture/idp",
            },
            {
              label: "Issues",
              href: "https://github.com/ourchitecture/idp/issues",
            },
          ],
        },
        {
          title: "Legal",
          items: [
            {
              label: "Privacy Policy",
              to: "/privacy",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Ourchitecture. Built with Docusaurus.`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
