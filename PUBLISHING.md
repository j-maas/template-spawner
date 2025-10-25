1. Update the version in `package.json`.
2. If necessary, update the [`minAppVersion`](https://docs.obsidian.md/Reference/TypeScript+API/PluginManifest/minAppVersion) in `manifest.json`.
3. Run `npm run version`.
4. Commit the updated files.
5. Push commit.
6. Run `git tag -a 1.0.1 -m 1.0.1` with the appropriate version number.
7. Run `git push origin 1.0.1` with the appropriate version number.
8. Wait for the release [action](https://github.com/j-maas/sync-safe-file-names/actions) to complete.
9. Edit the draft [release](https://github.com/j-maas/sync-safe-file-names/releases).

## Rerelease

If something goes wrong and you want to retrigger a release:

1. In the [repos tags on GitHub](https://github.com/j-maas/sync-safe-file-names/tags), delete the tag you want to rerelease.
2. Run `git tag -d 1.0.1` to remove the tag locally.
2. Run `git tag -a 1.0.1 -m 1.0.1` to recreate the tag on the new commit.
3. Run `git push origin 1.0.1` to recreate the tag on the origin and retrigger the release.
