import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import { Options, ThemeConfig } from "@docusaurus/preset-classic"

const config: Config = {
  title: "VannBrosPhaseTwo Documentation",
  tagline: 'Comprehensive documentation for the VannBrosPhaseTwo platform',
  favicon: "favicon.webp",

  url: "http://localhost:3000",
  baseUrl: "/",

  organizationName: "vannbrosphasetwo",
  projectName: "vannbrosphasetwo",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: 'https://bitbucket.org/folio3/vbagrierp/src/main/documentation/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          routeBasePath: "/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Options,
    ],
  ],

  themeConfig: {
    navbar: {
      logo: {
        alt: "VannBrosPhaseTwo Logo",
        src: "logo-dark.svg",
        srcDark: "logo.svg",
      },
      
      items: [
        {
          href: "https://bitbucket.org/folio3/vbagrierp",
          label: "Bitbucket",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",

          items: [
            {
              label: "Getting Started",
              to: "/project-overview",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Bitbucket",
              href: "https://bitbucket.org/folio3/vbagrierp",
            },
          ],
        },
      ],
      copyright: `Copyright © 2018 - ${new Date().getFullYear()} VannBrosPhaseTwo | All Rights Reserved`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["typescript", "bash", "json", "javascript"],
    },
    mermaid: {
      theme: { light: "neutral", dark: "dark" },
    },
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  } satisfies ThemeConfig,

  plugins: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        language: ["en"],
        indexDocs: true,
        indexPages: true,
        indexBlog: false,
        docsRouteBasePath: "/",
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  themes: ["@docusaurus/theme-mermaid"],
}

export default config
