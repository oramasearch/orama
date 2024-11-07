const head = [
  {
    tag: 'link',
    attrs: {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png'
    }
  },
  {
    tag: 'link',
    attrs: {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png'
    }
  },
  {
    tag: 'link',
    attrs: {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png'
    }
  },
  {
    tag: 'link',
    attrs: {
      rel: 'mask-icon',
      href: '/safari-pinned-tab.svg',
      color: '#3a0839'
    }
  },
  {
    tag: 'meta',
    attrs: {
      name: 'theme-color',
      content: '#000'
    }
  },
  {
    tag: 'script',
    attrs: {
      async: true,
      defer: true,
      src: 'https://buttons.github.io/buttons.js'
    }
  }
]

export default head
