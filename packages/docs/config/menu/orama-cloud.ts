const oramaCloudMenu = [
  {
    label: 'cloud',
    items: [
      {
        label: 'Getting started',
        collapsed: false,
        items: [
          {
            label: 'Introduction',
            link: '/cloud'
          },
          {
            label: "What's new?",
            link: '/cloud/whats-new'
          },
          {
            label: 'Glossary',
            link: '/cloud/glossary'
          }
        ]
      },
      {
        label: 'Importing data',
        collapsed: false,
        items: [
          {
            label: 'Data sources',
            link: '/cloud/data-sources/introduction-to-data-sources'
          },
          {
            label: 'Static files',
            link: '/cloud/data-sources/static-files'
          },
          {
            label: 'Native integrations',
            link: '/cloud/data-sources/native-integrations'
          },
          {
            label: 'Custom integrations',
            link: '/cloud/data-sources/custom-integrations'
          },
        ]
      },
      {
        label: 'Search engine',
        collapsed: true,
        items: [
          {
            label: 'Performing search',
            link: '/cloud/performing-search/'
          },
          {
            label: 'Full-text search',
            link: '/cloud/performing-search/full-text-search'
          },
          {
            label: 'Vector search',
            link: '/cloud/performing-search/vector-search'
          },
          {
            label: 'Hybrid search',
            link: '/cloud/performing-search/hybrid-search'
          },
          {
            label: "Multi-index search",
            link: "/cloud/performing-search/multi-index-search.html",
            badge: {
              text: "New",
              variant: "success"
            }
          },
        ]
      },
      {
        label: 'Answer engine',
        collapsed: true,
        items: [
          {
            label: 'Introduction to Answer Engine',
            link: '/cloud/answer-engine/'
          },
          {
            label: 'Creating an answer session',
            link: '/cloud/answer-engine/creating-an-answer-session'
          },
          {
            label: 'Providing more context',
            link: '/cloud/answer-engine/providing-additional-knowledge'
          },
          {
            label: 'Answers Customization',
            link: '/cloud/answer-engine/customizing-the-answers'
          }
        ]
      },
      {
        label: 'Audience management',
        collapsed: true,
        items: [
          {
            label: 'Introduction',
            link: '/cloud/audience-management/introduction'
          },
          {
            label: 'User segmentation',
            link: '/cloud/audience-management/user-segmentation'
          },
          {
            label: 'Triggers',
            link: '/cloud/audience-management/triggers'
          }
        ]
      },
      {
        label: 'Orama AI',
        collapsed: true,
        items: [
          {
            label: 'Embeddings generation',
            link: '/cloud/orama-ai/automatic-embeddings-generation'
          },
          {
            label: 'Secure proxy',
            link: '/cloud/orama-ai/orama-secure-proxy'
          }
        ]
      },
      {
        label: 'UI Components',
        collapsed: true,
        items: [
          {
            label: 'Design System',
            link: '/cloud/ui-components/design-system'
          },
          {
            label: 'Search Button',
            link: '/cloud/ui-components/search-button'
          },
          {
            label: 'Search Box',
            link: '/cloud/ui-components/search-box'
          },
          {
            label: 'Chat Box',
            link: '/cloud/ui-components/chat-box'
          },
        ]
      },
      {
        label: 'Integrating Orama Cloud',
        collapsed: false,
        items: [
          {
            label: 'Official SDKs',
            link: '/cloud/integrating-orama-cloud/official-sdk'
          },
          {
            label: 'Using JavaScript',
            link: '/cloud/integrating-orama-cloud/javascript-sdk'
          },
          {
            label: 'Using React',
            link: '/cloud/integrating-orama-cloud/react-sdk'
          },
          {
            label: 'Using Vue',
            link: '/cloud/integrating-orama-cloud/vue-sdk'
          }
        ]
      },
      {
        label: 'Guides and tutorials',
        collapsed: true,
        items: [
          {
            label: "Data sources",
            collapsed: false,
            items: [
              {
                label: 'Import a JSON file',
                link: '/cloud/data-sources/static-files/json-file'
              },
              {
                label: 'Import a CSV file',
                link: '/cloud/data-sources/static-files/csv-file'
              },
              {
                label: 'Connect to Shopify',
                link: '/cloud/data-sources/native-integrations/shopify'
              },
              {
                label: 'Connect to Elastic Path',
                link: '/cloud/data-sources/native-integrations/elasticpath'
              },
              {
                label: 'Connect to Strapi',
                link: '/cloud/data-sources/native-integrations/strapi'
              },
              {
                label: 'Connect to Docusaurus',
                link: '/cloud/data-sources/native-integrations/docusaurus'
              },
              {
                label: 'Connect via REST APIs',
                link: '/cloud/data-sources/custom-integrations/rest-apis'
              },
              {
                label: 'Connect via Remote JSON',
                link: '/cloud/data-sources/custom-integrations/remote-json'
              },
              {
                label: 'Scrape your website',
                link: '/cloud/data-sources/other-sources/web-crawler'
              }
            ]
          },
          {
            label: "Working with indexes",
            collapsed: false,
            items: [
              {
                label: 'Defining a schema',
                link: '/cloud/working-with-indexes/searchable-schema'
              },
              {
                label: 'Creating an index',
                link: '/cloud/working-with-indexes/create-a-new-index'
              },
              {
                label: 'Updating an index',
                link: '/cloud/working-with-indexes/edit-an-index'
              },
              {
                label: 'Deleting an index',
                link: '/cloud/working-with-indexes/delete-an-index'
              }
            ]
          },
          {
            label: "Learn more",
            collapsed: false,
            items: [
              {
                label: 'What is Orama Cloud?',
                link: '/cloud/understanding-orama/orama-cloud'
              },
              {
                label: 'Pricing and limits',
                link: '/cloud/understanding-orama/pricing-limits'
              },
            ]
          },
        ]
      },
      {
        label: 'Open Source',
        collapsed: true,
        items: [
          {
            label: 'Open Source Documentation',
            link: '/open-source'
          },
          {
            label: 'Github repository',
            link: 'https://github.com/oramasearch/orama'
          }
        ]
      }
    ]
  }
]

export default oramaCloudMenu
