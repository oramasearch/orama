<p align="center">
  <img src="https://raw.githubusercontent.com/oramasearch/orama/refs/heads/main/misc/readme/orama-readme-hero-dark.png#gh-dark-mode-only" />
  <img src="https://raw.githubusercontent.com/oramasearch/orama/refs/heads/main/misc/readme/orama-readme-hero-light.png#gh-light-mode-only" />
</p>

[![npm version](https://img.shields.io/npm/v/@orama/orama)](https://www.npmjs.com/package/@orama/orama)
[![Tests](https://github.com/oramasearch/orama/actions/workflows/turbo.yml/badge.svg)](https://github.com/oramasearch/orama/actions/workflows/turbo.yml)
[![Changelog](https://img.shields.io/badge/changelog-Keep%20a%20Changelog-E05735)](https://github.com/oramasearch/orama/blob/main/CHANGELOG.md)

If you need more info, help, or want to provide general feedback on Orama, join the [Orama Slack channel](https://orama.to/slack)

# Highlighted features

- [Full-Text search](https://docs.orama.com/docs/orama-js/search)
- [Vector Search](https://docs.orama.com/docs/orama-js/search/vector-search)
- [Hybrid Search](https://docs.orama.com/docs/orama-js/search/hybrid-search)
- [GenAI Chat Sessions](https://docs.orama.com/docs/orama-js/answer-engine)
- [Search Filters](https://docs.orama.com/docs/orama-js/search/filters)
- [Geosearch](https://docs.orama.com/docs/orama-js/search/geosearch)
- [Pinning Rules (Merchandising)](https://docs.orama.com/docs/orama-js/results-pinning)
- [Facets](https://docs.orama.com/docs/orama-js/search/facets)
- [Fields Boosting](https://docs.orama.com/docs/orama-js/search/fields-boosting)
- [Typo Tolerance](https://docs.orama.com/docs/orama-js/search#typo-tolerance)
- [Exact Match](https://docs.orama.com/docs/orama-js/search#exact-match)
- [BM25](https://docs.orama.com/docs/orama-js/search/bm25)
- [Stemming and tokenization in 30 languages](https://docs.orama.com/docs/orama-js/text-analysis/stemming)
- [Plugin System](https://docs.orama.com/docs/orama-js/plugins)

# Installation

You can install Orama using `npm`, `yarn`, `pnpm`, `bun`:

```sh
npm i @orama/orama
```

Or import it directly in a browser module:

```html
<html>
  <body>
    <script type="module">
      import { create, insert, search } from 'https://cdn.jsdelivr.net/npm/@orama/orama@latest/+esm'
    </script>
  </body>
</html>
```

With Deno, you can just use the same CDN URL or use npm specifiers:

```js
import { create, search, insert } from 'npm:@orama/orama'
```

Read the complete documentation at [https://docs.orama.com](https://docs.orama.com).

# Orama Features

<p align="center">
  <img src="https://raw.githubusercontent.com/oramasearch/orama/refs/heads/main/misc/readme/features-dark.png#gh-dark-mode-only" />
  <img src="https://raw.githubusercontent.com/oramasearch/orama/refs/heads/main/misc/readme/features-light.png#gh-light-mode-only" />
</p>

# Usage

Orama is quite simple to use. The first thing to do is to create a new database
instance and set an indexing schema:

```js
import { create, insert, remove, search, searchVector } from '@orama/orama'

const db = create({
  schema: {
    name: 'string',
    description: 'string',
    price: 'number',
    embedding: 'vector[1536]', // Vector size must be expressed during schema initialization
    meta: {
      rating: 'number',
    },
  },
})

insert(db, {
  name: 'Noise cancelling headphones',
  description: 'Best noise cancelling headphones on the market',
  price: 99.99,
  embedding: [0.2432, 0.9431, 0.5322, 0.4234, ...],
  meta: {
    rating: 4.5
  }
})

const results = search(db, {
  term: 'Best headphones'
})

// {
//   elapsed: {
//     raw: 21492,
//     formatted: '21μs',
//   },
//   hits: [
//     {
//       id: '41013877-56',
//       score: 0.925085832971998432,
//       document: {
//         name: 'Noise cancelling headphones',
//         description: 'Best noise cancelling headphones on the market',
//         price: 99.99,
//         embedding: [0.2432, 0.9431, 0.5322, 0.4234, ...],
//         meta: {
//           rating: 4.5
//         }
//       }
//     }
//   ],
//   count: 1
// }
```

Orama currently supports 10 different data types:

| Type             | Description                                                                 | Example                                                                     |
| ---------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `string`         | A string of characters.                                                     | `'Hello world'`                                                             |
| `number`         | A numeric value, either float or integer.                                   | `42`                                                                        |
| `boolean`        | A boolean value.                                                            | `true`                                                                      |
| `enum`           | An enum value.                                                              | `'drama'`                                                                   |
| `geopoint`       | A geopoint value.                                                           | `{ lat: 40.7128, lon: 74.0060 }`                                            |
| `string[]`       | An array of strings.                                                        | `['red', 'green', 'blue']`                                                  |
| `number[]`       | An array of numbers.                                                        | `[42, 91, 28.5]`                                                            |
| `boolean[]`      | An array of booleans.                                                       | `[true, false, false]`                                                      |
| `enum[]`         | An array of enums.                                                          | `['comedy', 'action', 'romance']`                                           |
| `vector[<size>]` | A vector of numbers to perform vector search on.                            | `[0.403, 0.192, 0.830]`                                                     |

# Vector and Hybrid Search Support

Orama supports both vector and hybrid search by just setting `mode: 'vector'` when performing search.

To perform this kind of search, you'll need to provide [text embeddings](https://en.wikipedia.org/wiki/Word_embedding) at search time:

```js
import { create, insertMultiple, search } from '@orama/orama'

const db = create({
  schema: {
    title: 'string',
    embedding: 'vector[5]', // we are using a 5-dimensional vector.
  },
});

insertMultiple(db, [
  { title: 'The Prestige', embedding: [0.938293, 0.284951, 0.348264, 0.948276, 0.56472] },
  { title: 'Barbie', embedding: [0.192839, 0.028471, 0.284738, 0.937463, 0.092827] },
  { title: 'Oppenheimer', embedding: [0.827391, 0.927381, 0.001982, 0.983821, 0.294841] },
])

const results = search(db, {
  // Search mode. Can be 'vector', 'hybrid', or 'fulltext'
  mode: 'vector',
  vector: {
    // The vector (text embedding) to use for search
    value: [0.938292, 0.284961, 0.248264, 0.748276, 0.26472],
    // The schema property where Orama should compare embeddings
    property: 'embedding',
  },
  // Minimum similarity to determine a match. Defaults to `0.8`
  similarity: 0.85,
  // Defaults to `false`. Setting to 'true' will return the embeddings in the response (which can be very large).
  includeVectors: true,
})
```

Have trouble generating embeddings for vector and hybrid search? Try our `@orama/plugin-embeddings` plugin!

```js
import { create } from '@orama/orama'
import { pluginEmbeddings } from '@orama/plugin-embeddings'
import '@tensorflow/tfjs-node' // Or any other appropriate TensorflowJS backend, like @tensorflow/tfjs-backend-webgl

const plugin = await pluginEmbeddings({
  embeddings: {
    // Schema property used to store generated embeddings
    defaultProperty: 'embeddings',
    onInsert: {
      // Generate embeddings at insert-time
      generate: true,
      // properties to use for generating embeddings at insert time.
      // Will be concatenated to generate a unique embedding.
      properties: ['description'],
      verbose: true,
    }
  }
})

const db = create({
  schema: {
    description: 'string',
    // Orama generates 512-dimensions vectors.
    // When using @orama/plugin-embeddings, set the property where you want to store embeddings as `vector[512]`.
    embeddings: 'vector[512]'
  },
  plugins: [plugin]
})

// Orama will generate and store embeddings at insert-time!
await insert(db, { description: 'Classroom Headphones Bulk 5 Pack, Student On Ear Color Varieties' })
await insert(db, { description: 'Kids Wired Headphones for School Students K-12' })
await insert(db, { description: 'Kids Headphones Bulk 5-Pack for K-12 School' })
await insert(db, { description: 'Bose QuietComfort Bluetooth Headphones' })

// Orama will also generate and use embeddings at search time when search mode is set to "vector" or "hybrid"!
const searchResults = await search(db, {
  term: 'Headphones for 12th grade students',
  mode: 'vector',
  similarity: 0.75,
})
```

Want to use OpenAI embedding models? Use our [Secure Proxy](https://docs.orama.com/docs/orama-js/plugins/plugin-secure-proxy) plugin to call OpenAI from the client-side securely.

# RAG and Chat Experiences with Orama

Since `v3.0.0`, Orama allows you to create your own ChatGPT/Perplexity/SearchGPT-like experience. You will need to call the OpenAI APIs, so we strongly recommend using the [Secure Proxy Plugin](https://docs.orama.com/docs/orama-js/plugins/plugin-secure-proxy) to do that securely from your client side. It's free!

```js
import { create, insert } from '@orama/orama'
import { pluginSecureProxy } from '@orama/plugin-secure-proxy'

const secureProxy = await pluginSecureProxy({
  apiKey: 'my-api-key',
  defaultProperty: 'embeddings',
  models: {
    // The chat model to use to generate the chat answer
    chat: 'openai/gpt-4o-mini'
  }
})

const db = create({
  schema: {
    name: 'string'
  },
  plugins: [secureProxy]
})

insert(db, { name: 'John Doe' })
insert(db, { name: 'Jane Doe' })

const session = new AnswerSession(db, {
  // Customize the prompt for the system
  systemPrompt: 'You will get a name as context, please provide a greeting message',
  events: {
    // Log all state changes. Useful to reactively update a UI on a new message chunk, sources, etc.
    onStateChange: console.log,
  }
})

const response = await session.ask({
  term: 'john'
})

console.log(response) // Hello, John Doe! How are you doing?
```

Read the complete [documentation](https://docs.orama.com/docs/orama-js/answer-engine).

# Official Docs

Read the complete documentation at [https://docs.orama.com/open-source](https://docs.orama.com/open-source).

# Official Orama Plugins

- [Plugin Embeddings](https://docs.orama.com/docs/orama-js/plugins/plugin-embeddings)
- [Plugin Secure Proxy](https://docs.orama.com/docs/orama-js/plugins/plugin-secure-proxy)
- [Plugin Analytics](https://docs.orama.com/docs/orama-js/plugins/plugin-analytics)
- [Plugin Data Persistence](https://docs.orama.com/docs/orama-js/plugins/plugin-data-persistence)
- [Plugin QPS](https://docs.orama.com/docs/orama-js/plugins/plugin-qps)
- [Plugin PT15](https://docs.orama.com/docs/orama-js/plugins/plugin-pt15)
- [Plugin Vitepress](https://docs.orama.com/docs/orama-js/plugins/plugin-vitepress)
- [Plugin Docusaurus](https://docs.orama.com/docs/orama-js/plugins/plugin-docusaurus)
- [Plugin Astro](https://docs.orama.com/docs/orama-js/plugins/plugin-astro)
- [Plugin Nextra](https://docs.orama.com/docs/orama-js/plugins/plugin-nextra)

Write your own plugin: [https://docs.orama.com/docs/orama-js/plugins/writing-your-own-plugins](https://docs.orama.com/docs/orama-js/plugins/writing-your-own-plugins)

# License

Orama is licensed under the [Apache 2.0](/LICENSE.md) license.

<img referrerpolicy="no-referrer-when-downgrade" src="https://static.scarf.sh/a.png?x-pxid=16782f89-15fb-4e03-8e9c-2a06106542f7" />

## 🌐 Web Resources & Interactive Index
- [CATEGORY LOGIC538](https://iskillcrafts.web.app/category-logic538.html)
- [CATEGORY PIXEL313](https://theskillquest.pages.dev/category-pixel313.html)
- [TROPICAL MATCH 2](https://studyquests.github.io/tropical-match-2.html)
- [CATEGORY TOWER DEFENSE118](https://themindplays.pages.dev/category-tower-defense118.html)
- [THE WALKING DEADBLOCKS](https://themindzone.pages.dev/the-walking-deadblocks.html)
- [SNIPER 3D ZOMBIE](https://studyplayings.web.app/sniper-3d-zombie.html)
- [CELEBRITY SPRING MANICURE DESIGN](https://quizverses.github.io/celebrity-spring-manicure-design.html)
- [PING PONG AIR](https://theskillquest.pages.dev/ping-pong-air.html)
- [CATEGORY EDUCATIONAL](https://thelearnquesters.pages.dev/category-educational.html)
- [ASSASSIN COMMANDO CAR DRIVING](https://theskillquest.pages.dev/assassin-commando-car-driving.html)
- [FIND RESTORE HIDDEN PUZZLE](https://studyquests.github.io/find-restore-hidden-puzzle.html)
- [ENERGY CLICKER](https://studyquests.github.io/energy-clicker.html)
- [CATEGORY PUZZLE 11](https://iskillquest.pages.dev/category-puzzle-11.html)
- [FASHION MAKEOVER DASH](https://quizverses.github.io/fashion-makeover-dash.html)
- [FARM OF WORDS](https://studyplayings.web.app/farm-of-words.html)
- [ADDICTION SOLITAIRE](https://studyplayings.pages.dev/addiction-solitaire.html)
- [SCARY TEACHER 3D RETURNS](https://quizverses.github.io/scary-teacher-3d-returns.html)
- [INDEX36](https://iskillquest.pages.dev/index36.html)
- [MY CASTLE MERGE STORY](https://themindzone.pages.dev/my-castle-merge-story.html)
- [PYRAMIDZ2](https://themindzone.pages.dev/pyramidz2.html)
- [ONLINE CATS MULTIPLAYER PARK](https://themindzone.pages.dev/online-cats-multiplayer-park.html)
- [KICK LUCKY BOXES ONLINE](https://quizverses.github.io/kick-lucky-boxes-online.html)
- [BRAWL STARS SOUND](https://theskillquest.pages.dev/brawl-stars-sound.html)
- [TIED UP](https://studyplayings.web.app/tied-up.html)
- [SPACE SURVIVAL RAINBOW FRIENDS MONSTER](https://theskillquest.pages.dev/space-survival-rainbow-friends-monster.html)
- [HELP ME TRICKY BRAIN PUZZLES](https://studyplayings.pages.dev/help-me-tricky-brain-puzzles.html)
- [IDLE FIREFIGHTER 3D](https://theskillquest.pages.dev/idle-firefighter-3d.html)
- [MAZOO](https://studyplayings.web.app/mazoo.html)
- [MINEBLOCK OBBY](https://themindzone.pages.dev/mineblock-obby.html)
- [UNBLOCK BALL SLIDE PUZZLE](https://studyplayings.pages.dev/unblock-ball-slide-puzzle.html)
- [CAR ESCAPE](https://studyplayings.web.app/car-escape.html)
- [WOOD SCREW PUZZLE](https://themindzone.pages.dev/wood-screw-puzzle.html)
- [MAGIC BRICK WARS](https://theskillquest.pages.dev/magic-brick-wars.html)
- [THE BEST WARRIOR](https://theskillquest.pages.dev/the-best-warrior.html)
- [CATEGORY ART](https://learnquester.github.io/category-art.html)
- [CATEGORY CAN T STOP PLAYING212](https://quizverses-9d2f2.web.app/category-can-t-stop-playing212.html)
- [MATH STARS](https://themindzone.pages.dev/math-stars.html)
- [LOGIC STORM ANIMALS PUZZLE](https://studyplayings.web.app/logic-storm-animals-puzzle.html)
- [STICK TACTICS DESTRUCTION](https://studyplayings.pages.dev/stick-tactics-destruction.html)
- [DRAGON HUNTER](https://studyquests.github.io/dragon-hunter.html)
- [TWILIGHT SOLITAIRE TRIPEAKS](https://studyquests.github.io/twilight-solitaire-tripeaks.html)
- [BLACK JUMP](https://studyquests.github.io/black-jump.html)
- [HIDE AND SEEK BLUE MONSTER](https://themindzone.pages.dev/hide-and-seek-blue-monster.html)
- [MERMAIDCORE MAKEUP](https://quizverses.github.io/mermaidcore-makeup.html)
- [GRAND CLASH ARENA](https://theskillquest.pages.dev/grand-clash-arena.html)
- [STYLISH NAIL ART](https://themindzone.pages.dev/stylish-nail-art.html)
- [CATEGORY MAKEUP51](https://studyquesthub.web.app/category-makeup51.html)
- [EARTH DEFENDER](https://themindzone.pages.dev/earth-defender.html)
- [PYRAMIDZ](https://studyplayings.web.app/pyramidz.html)
- [CONNECT THE DOTS COLOR LINES](https://quizverses.github.io/connect-the-dots-color-lines.html)
- [SANDBOX DESTROY THE RAGDOLL](https://themindzone.pages.dev/sandbox-destroy-the-ragdoll.html)
- [MURDER MYSTERY](https://theskillquest.pages.dev/murder-mystery.html)
- [GRANNYS CLASSROOM NIGHTMARE](https://learnquester.github.io/grannys-classroom-nightmare.html)
- [MINI GAMES RELAX COLLECTION 2](https://themindzone.pages.dev/mini-games-relax-collection-2.html)
- [SINGLE LINE PUZZLE DRAWING](https://studyplayings.web.app/single-line-puzzle-drawing.html)
- [MEGA MAKEUP SEASONS BEST](https://theskillquest.pages.dev/mega-makeup-seasons-best.html)
- [CATEGORY BATTLESHIP](https://iskillquest.pages.dev/category-battleship.html)
- [TILE CONNECT CLUB](https://studyquests.github.io/tile-connect-club.html)
- [BIG BLOCK BLAST](https://studyplayings.web.app/big-block-blast.html)
- [ITALIAN BRAINROT PUZZLE](https://themindzone.pages.dev/italian-brainrot-puzzle.html)
- [PALKOVIL THE WAY HOME](https://themindzone.pages.dev/palkovil-the-way-home.html)
- [TAP BEAD](https://studyplayings.web.app/tap-bead.html)
- [BALL DUNK FALL](https://theskillquest.pages.dev/ball-dunk-fall.html)
- [ONE SHOT TOWER PHYSICS DESTROYER](https://theskillquest.pages.dev/one-shot-tower-physics-destroyer.html)
- [EVONY THE KINGS RETURN](https://theskillquest.pages.dev/evony-the-kings-return.html)
- [WILD HUNTING CLASH](https://themindzone.pages.dev/wild-hunting-clash.html)
- [BALL EATING SIMULATOR](https://theskillquest.pages.dev/ball-eating-simulator.html)
- [INDEX3](https://quizverses-9d2f2.web.app/index3.html)
- [CATEGORY CASUAL 2](https://iskillquest.pages.dev/category-casual-2.html)
- [METAL GUNS FURY](https://studyquests.github.io/metal-guns-fury.html)
- [HOLE AND FILL COLLECT MASTER](https://themindzone.pages.dev/hole-and-fill-collect-master.html)
- [CAR FACTORY FOR KIDS](https://theskillquest.pages.dev/car-factory-for-kids.html)
- [DONNES SPINNING WORLD](https://theskillquest.pages.dev/donnes-spinning-world.html)
- [FRUIT PARTY](https://studyplayings.pages.dev/fruit-party.html)
- [SPIDER BUBU](https://themindzone.pages.dev/spider-bubu.html)
- [ECHOLOCATION SHOOTER](https://themindzone.pages.dev/echolocation-shooter.html)
- [RAGDOLL ARENA 2 PLAYER](https://themindzone.pages.dev/ragdoll-arena-2-player.html)
- [ARROW ESCAPE](https://theskillquest.pages.dev/arrow-escape.html)
- [COLOR COCKTAIL](https://theskillquest.pages.dev/color-cocktail.html)
- [PACKING LINE](https://quizverses.github.io/packing-line.html)
- [CATEGORY CAR376](https://studyplayings.web.app/category-car376.html)
- [MEMORY WARS](https://themindzone.pages.dev/memory-wars.html)
- [SUPER DOG HERO DASH](https://themindzone.pages.dev/super-dog-hero-dash.html)
- [FORMULA RACING GAMES CAR GAME](https://quizverses.pages.dev/formula-racing-games-car-game.html)
- [CATEGORY 3D1 371](https://studyplayings.pages.dev/category-3d1-371.html)
- [SAVE THE CROP](https://studyplaying.github.io/save-the-crop.html)
- [OBBY FOOTBALL SOCCER 3D](https://theskillquest.pages.dev/obby-football-soccer-3d.html)
- [BUBBLE SHOOTER PRO 4](https://themindzone.pages.dev/bubble-shooter-pro-4.html)
- [GROW A GARDEN 3D](https://theskillquest.pages.dev/grow-a-garden-3d.html)
- [MYSTICAL BLADE 3D](https://theskillquest.pages.dev/mystical-blade-3d.html)
- [CATEGORY QUIZ](https://quizverses.pages.dev/category-quiz.html)
- [CATEGORY MOBILE2 095](https://studyplayings.web.app/category-mobile2-095.html)
- [CATEGORY PUZZLE 5](https://learnquester.github.io/category-puzzle-5.html)
- [CATEGORY ROGUELIKE GAMES](https://studyplayings.pages.dev/category-roguelike-games.html)
- [BR BR PATAPIM OBBY CHALLENGE](https://theskillquest.pages.dev/br-br-patapim-obby-challenge.html)
- [CATEGORY TANK58](https://thelearnquesters.pages.dev/category-tank58.html)
- [HIPPO SUPERMARKET](https://thelearnquesters.pages.dev/hippo-supermarket.html)
- [CATEGORY BIKE 2](https://thequizzone.pages.dev/category-bike-2.html)
- [FARM MATCH SEASONS 2](https://thelearnquesters.pages.dev/farm-match-seasons-2.html)
- [KOMARU CAT](https://thelearnquesters.pages.dev/komaru-cat.html)
- [TAYLOR DRESS STUDIO PREPPY WILD WEST GLAM](https://studyquests.github.io/taylor-dress-studio-preppy-wild-west-glam.html)
- [POOL MASTER](https://theskillquest.pages.dev/pool-master.html)
- [CATEGORY JIGSAW10](https://quizverses.pages.dev/category-jigsaw10.html)
- [CATEGORY RUNNING107](https://studyplayings.pages.dev/category-running107.html)
- [FUN MINI GAMES FOR PRINCESS](https://thelearnquesters.pages.dev/fun-mini-games-for-princess.html)
- [MERGE HOTEL DEV](https://thelearnquesters.pages.dev/merge-hotel-dev.html)
- [MINECRAFT BATTLE PARTY](https://themindzone.pages.dev/minecraft-battle-party.html)
- [TILE SORT MATCH 3](https://studyplayings.web.app/tile-sort-match-3.html)
- [SLINKY COLOR SORT](https://studyquests.github.io/slinky-color-sort.html)
- [CATEGORY CASUAL 8](https://iskillquest.pages.dev/category-casual-8.html)
- [FALLING ART RAGDOLL SIMULATOR](https://studyquests.github.io/falling-art-ragdoll-simulator.html)
- [SAMURAI MADNESS](https://thequizzone.pages.dev/samurai-madness.html)
- [CATEGORY FPS174](https://learnquester.github.io/category-fps174.html)
- [QUEST BY COUNTRY](https://thequizzone.pages.dev/quest-by-country.html)
- [FASHION CHALLENGE CATWALK RUN](https://quizverses.pages.dev/fashion-challenge-catwalk-run.html)
- [ICE CREAM SORT](https://studyquests.github.io/ice-cream-sort.html)
- [HEX PLANET IDLE](https://quizverses.github.io/hex-planet-idle.html)
- [MUSIC CAT PIANO TILES GAME 3D](https://thequizzone.pages.dev/music-cat-piano-tiles-game-3d.html)
- [ANIMAL SWIPE](https://thelearnquesters.pages.dev/animal-swipe.html)
- [ROPE SORTING](https://studyquests.github.io/rope-sorting.html)
- [CATEGORY QUIZ](https://themindzone.pages.dev/category-quiz.html)
- [CATEGORY MANAGEMENT209](https://quizverses.pages.dev/category-management209.html)
- [SHELF SHIFT MATCH](https://quizverses.pages.dev/shelf-shift-match.html)
- [BARBEE SUMMER VACATION](https://studyquesthub.web.app/barbee-summer-vacation.html)
- [DONUT BOX](https://thelearnquesters.pages.dev/donut-box.html)
- [THE OFFICE ESCAPE](https://theskillquest.pages.dev/the-office-escape.html)
- [FASHIONISTA CHRISTMAS EVE PARTY](https://thequizzone.pages.dev/fashionista-christmas-eve-party.html)
- [MOLANG MATCHN MUNCH](https://studyplayings.pages.dev/molang-matchn-munch.html)
- [BRAINROT BRIDGE RACE 3D](https://studyplayings.web.app/brainrot-bridge-race-3d.html)
- [CATEGORY MAGIC46](https://studyquesthub.web.app/category-magic46.html)
