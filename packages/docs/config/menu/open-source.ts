const openSourceMenu = [
  {
    label: 'open-source',
    items: [
      {
        label: 'Open Source',
        collapsed: false,
        items: [
          {
            label: 'Getting Started',
            link: '/open-source'
          },
          {
            label: 'Create',
            link: '/open-source/usage/create'
          },
          {
            label: 'Insert',
            link: '/open-source/usage/insert'
          },
          {
            label: 'Remove',
            link: '/open-source/usage/remove'
          },
          {
            label: 'Update',
            link: '/open-source/usage/update'
          },
          {
            label: 'Upsert',
            link: '/open-source/usage/upsert'
          },
          {
            label: 'Utilities',
            link: '/open-source/usage/utilities'
          },
          {
            label: 'Search',
            collapsed: true,
            items: [
              {
                label: 'Searching with Orama',
                link: '/open-source/usage/search/introduction'
              },
              {
                label: 'Changing Default Search Algorithm',
                link: '/open-source/usage/search/changing-search-algorithm'
              },
              {
                label: 'Vector Search',
                link: '/open-source/usage/search/vector-search'
              },
              {
                label: 'Hybrid Search',
                link: '/open-source/usage/search/hybrid-search'
              },
              {
                label: 'Fields Boosting',
                link: '/open-source/usage/search/fields-boosting'
              },
              {
                label: 'Custom Search Priority',
                link: '/open-source/usage/search/custom-search-priority'
              },
              {
                label: 'Facets',
                link: '/open-source/usage/search/facets'
              },
              {
                label: 'Filters',
                link: '/open-source/usage/search/filters'
              },
              {
                label: 'GeoSearch',
                link: '/open-source/usage/search/geosearch'
              },
              {
                label: 'Sorting',
                link: '/open-source/usage/search/sorting'
              },
              {
                label: 'Grouping',
                link: '/open-source/usage/search/grouping'
              },
              {
                label: 'Threshold',
                link: '/open-source/usage/search/threshold'
              },
              {
                label: 'Preflight',
                link: '/open-source/usage/search/preflight'
              },
              {
                label: 'BM25',
                link: '/open-source/usage/search/bm25-algorithm'
              }
            ]
          },
          {
            label: 'GenAI Answer Engine',
            collapsed: false,
            items: [
              {
                label: 'Orama GenAI Answer Engine',
                link: '/open-source/usage/answer-engine/introduction'
              }
            ]
          },
          {
            label: 'Supported languages',
            collapsed: true,
            items: [
              {
                label: 'Officially Supported Languages',
                link: '/open-source/supported-languages'
              },
              {
                label: 'Using Chinese with Orama',
                link: '/open-source/supported-languages/using-chinese-with-orama'
              },
              {
                label: 'Using Japanese with Orama',
                link: '/open-source/supported-languages/using-japanese-with-orama'
              }
            ]
          },
          {
            label: 'TypeScript',
            link: '/open-source/usage/typescript'
          }
        ]
      },
      {
        label: 'Internals',
        collapsed: true,
        items: [
          {
            label: 'Components',
            link: '/open-source/internals/components'
          },
          {
            label: 'Utilities',
            link: '/open-source/internals/utilities'
          }
        ]
      },
      {
        label: 'Plugins',
        collapsed: true,
        items: [
          {
            label: 'Introduction',
            link: '/open-source/plugins/introduction'
          },
          {
            label: 'Writing your own plugins',
            link: '/open-source/plugins/writing-your-own-plugins'
          },
          {
            label: 'Plugin Embeddings',
            link: '/open-source/plugins/plugin-embeddings'
          },
          {
            label: 'Plugin Vitepress',
            link: '/open-source/plugins/plugin-vitepress'
          },
          {
            label: 'Plugin Docusaurus',
            link: '/open-source/plugins/plugin-docusaurus'
          },
          {
            label: 'Plugin Secure Proxy',
            link: '/open-source/plugins/plugin-secure-proxy'
          },
          {
            label: 'Plugin Analytics',
            link: '/open-source/plugins/plugin-analytics'
          },
          {
            label: 'Plugin Astro',
            link: '/open-source/plugins/plugin-astro'
          },
          {
            label: 'Plugin Data Persistence',
            link: '/open-source/plugins/plugin-data-persistence'
          },
          {
            label: 'Plugin QPS',
            link: '/open-source/plugins/plugin-qps'
          },
          {
            label: 'Plugin PT15',
            link: '/open-source/plugins/plugin-pt15'
          },
          {
            label: 'Plugin Match Highlight',
            link: '/open-source/plugins/plugin-match-highlight'
          },
          {
            label: 'Plugin Parsedoc',
            link: '/open-source/plugins/plugin-parsedoc'
          },
          {
            label: 'Plugin Nextra',
            link: '/open-source/plugins/plugin-nextra'
          }
        ]
      },
      {
        label: 'Text Analysis',
        collapsed: true,
        items: [
          {
            label: 'Stemming',
            link: '/open-source/text-analysis/stemming'
          },
          {
            label: 'Stopwords',
            link: '/open-source/text-analysis/stopwords'
          }
        ]
      },
      {
        label: 'Orama Cloud',
        collapsed: true,
        items: [
          {
            label: 'Documentation',
            link: '/cloud'
          },
          {
            label: 'Visit Orama Cloud',
            link: 'https://cloud.orama.com'
          }
        ]
      }
    ]
  }
]

export default openSourceMenu
