# Orama Plugin for Docusaurus v3

[Plugin documentation](https://docs.orama.com/open-source/plugins/plugin-docusaurus)

## Local Development

To test the plugin locally, follow these steps:

### (Required only if using workspace dependencies):
Replace all the `workspace:*` packages with the latest version of the package.

#### Steps:
1. Add a link to the plugin in your Docusaurus project:

```bash
"dependencies": {
  "@orama/plugin-docusaurus": "file:../path/to/plugin"
}
```
2. Install the plugin:

```bash
pnpm install
```

3. Start your Plugin project (plugin folder):

```bash
pnpm run watch
```

4. Copy the needed CSS files into dist folder:
```bash
pnpm run postbuild
```

5. Start your Docusaurus project:

```bash
pnpm start
```

The Docusaurus project will watch automatically for changes in the plugin, so you can edit the plugin and see the changes in real-time.

### Other information
- The Answer Session will not work while working on Staging due to the answer session url being hard-corded to production. To test it please, use prod environment.


For Docusaurus v2, please refer to the [v2 branch.](https://www.npmjs.com/package/@orama/plugin-docusaurus)
