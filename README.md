# companion-module-sonos-speakers

## Getting started

Execute `yarn` command to install the dependencies.

The module can be built once with `yarn build`. This should be enough to get the module to be loadable by companion.

While developing the module, by using `yarn dev` the compiler will be run in watch mode to recompile the files on change.

Package the module with `yarn package`. Requires Node 26.

## Changes

### v2.0.0

- Update for Companion 5 (`@companion-module/base` 2.x), now running on Node 26
- Update `@svrooij/sonos` to 2.7, TypeScript 6, ESLint 10 and the current Companion module tooling
- Variables: `volume` is now a number (0-100) so it works in expressions; the old text form (e.g. `50%`) is available as `volume_text`
- New variables per device: `muted`, `state`, `track_title`, `track_artist`, `track_album`, `album_art`, `repeat`, `shuffle`, `is_coordinator`, `group_members`
- New playback actions: stop, seek (absolute and relative), repeat, shuffle, crossfade, play/clear/remove queue tracks, switch to queue, line-in and TV input
- New actions to play Sonos favourites and TuneIn radio stations (with a dropdown filled from the speakers), and a sleep timer
- New alarm actions: enable/disable and snooze
- New grouping actions: join group, leave group, party mode and transfer playback, plus group volume, adjust group volume and group mute
- New EQ and home theatre actions: bass, treble, loudness, balance, night mode, speech enhancement, subwoofer enable/gain, surround enable/levels/music mode, and volume ramp
- New feedbacks: repeat mode, shuffle, grouped and group coordinator
- Presets are now grouped per device (playback, volume, grouping), with next/previous/stop/repeat/shuffle/sleep presets, and presets for each favourite and radio station
- Status is now also read directly from the speakers every few seconds (configurable), so variables and feedbacks work even when the speakers' own updates cannot reach Companion. New optional setting to choose the network interface for speaker updates, and a `volume_fixed` variable (fixed-volume speakers report 100)
- Presets are registered after actions and feedbacks, so they no longer reference unknown definitions
- Many of these were inspired by [SoCo-CLI](https://github.com/avantrec/soco-cli). Subwoofer, surround, balance and alarm actions depend on the speaker model and have had little real-world testing
- Fix volume +/- presets not being tied to their device
- Fix copy-pasted error messages in actions, and report failures of the load stream action
- Show a bad config status when no discovery IP is set, and avoid stale connections when the config changes quickly

### v1.1.0

- Add action and feedback for mute state
- Update sonos library for improved compatibility
- Add action to load stream by url

### v1.0.0

- Update for Companion 3

### v0.2.0

- Update for improved instance_skel.checkFeedbacks signature

### v0.1.1

- fix build issues
