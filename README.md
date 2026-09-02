# vos release media, on every pull request

A GitHub Action that records the real product in CI, cuts the release's media from it (store screenshots, cards, the README loop, the demo), verifies every asset against its channel spec, pushes the take to [vos.so](https://vos.so), and keeps **one comment on the pull request** with the watch page and the kit. The next release is a re-render of the same click script, not a re-shoot.

```yaml
name: release media
on:
  pull_request:
  push:
    tags: ['v*']
permissions:
  contents: read
  pull-requests: write
jobs:
  media:
    runs-on: ubuntu-latest # ships Google Chrome, which mp4 renders need
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: vosjs/action@v1
        with:
          key: ${{ secrets.VOS_API_KEY }} # mint one at vos.so/app/api
```

What lands on the pull request:

> ### Release media for `pr-42`
>
> **Watch** https://vos.so/vos/… (v3) · **edit** https://vos.so/studio?vos=… · `vos pull` brings studio edits back.
>
> | Channel | Asset | Size | Bytes | Length | Moment |
> | --- | --- | --- | --- | --- | --- |
> | cws | screenshot | 1280x800 | 260 KB | | 14.5 s |
> | github | readme-loop | 1920x1080 | 880 KB | 16.0 s | |
>
> **Verifier:** 0 problems across 11 assets, re-measured from their bytes.

The comment is found by its marker and updated in place, so a pull request with ten pushes has one comment, not ten. Reviewers, QA and marketing sign off on a link instead of pulling the branch. The same run on a tag is the release.

## What the repo carries

```
media/
  actions.json   the click script (the next release's script too)
  doc.json       the signed-off cut (zooms, trims, speed, all data); carried onto new footage by vos plan --reuse
  vos.json       which vos on the shelf the pushes version
  config.json    a poster program for the card destinations, optional
  BRAND.md       the brand kit; write it once with `vos brand https://your.app`
```

Start with the [launch-kit skill](https://github.com/vosjs/skills) (`npx skills add vosjs/skills`) or the [every-release guide](https://vos.so/docs/guides/every-release); the action runs what the skill produced.

## Inputs

| Input | Default | What it does |
| --- | --- | --- |
| `actions` | `media/actions.json` | The click script `vos record` drives. |
| `doc` | `media/doc.json` | The committed cut to carry onto the new footage. Skipped when the file is absent. |
| `channels` | `cws,og,github` | The channel set `vos deliver` renders (`cws,producthunt,x,linkedin,og,github,youtube` or `all`). |
| `poster` | | A poster program for the card destinations. |
| `shot-time` | | The take moment (output seconds) baked into the poster. |
| `release` | tag, or `pr-<n>` | The name on the kit and the push label. |
| `key` | | A vos.so content key. Without one the take is not pushed; the kit and the comment still land. |
| `tracking` | `media/vos.json` | Which vos the pushes version. |
| `comment` | `true` | Keep the sticky comment (needs `pull-requests: write`). |
| `take` | runner temp | Where the take is recorded. |

Outputs: `kit`, `vos-id`, `version`, `watch-url`.

## What it refuses

`vos record --strict` fails the job on a skipped selector instead of shipping around it. A push against a stale base fails with the changelog of what changed on the shelf. A kit that fails its own verifier (`vos validate`) fails the job after the comment says why. Store uploads stay yours: the kit is an artifact on the run, never uploaded to a store.

MIT. The CLI pair it installs, `@vosjs/cli` and `@vosso/vos-plugin`, is MIT too.
